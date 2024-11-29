import nodeCluster from 'cluster'
import colors from 'colors/safe.js'
import {HTTPError} from 'got'
import {max} from 'lodash-es'
import ms from 'ms'
import {join} from 'path'
import {fileURLToPath} from 'url'
import {Cluster} from './cluster.js'
import {config} from './config.js'
import {logger} from './logger.js'
import {TokenManager} from './token.js'
import {IFileList} from './types.js'

// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = fileURLToPath(new URL('.', import.meta.url))

export async function bootstrap(version: string): Promise<void> {
  logger.info(colors.green(`正在启动 OpenMCIM ${version}`))
  const tokenManager = new TokenManager(config.clusterId, config.clusterSecret, version)
  await tokenManager.getToken()
  const skipfileshacheck = config.skipfileshacheck ?? false;// 获取跳过文件校验布尔值，默认false
  const cluster = new Cluster(config.clusterSecret, version, tokenManager, skipfileshacheck)
  await cluster.init()

  const storageReady = await cluster.storage.check()
  if (!storageReady) {
    throw new Error('存储异常');
  }

  const configuration = await cluster.getConfiguration()
  const files = await cluster.getFileList()
  logger.info(`${files.files.length} files`)
  try {
    await cluster.syncFiles(files, configuration.sync)
  } catch (e) {
    if (e instanceof HTTPError) {
      logger.error({url: e.response.url}, '下载错误')
    }
    throw e
  }
  logger.info('回收文件')
  if (process.env.SKIP_GC) {
    logger.info('已跳过文件回收')
  }else{
    cluster.gcBackground(files)
  }

  cluster.connect()
  let proto: 'http' | 'https' = 'https'
  if (config.byoc) {
    // 当BYOC但是没有提供证书时，使用http
    if (!config.sslCert || !config.sslKey) {
      proto = 'http'
    } else {
      logger.info('使用自定义证书')
      await cluster.useSelfCert()
    }
  } else {
    logger.info('请求证书')
    await cluster.requestCert()
  }
  
  if (config.enableNginx) {
    if (typeof cluster.port === 'number') {
      await cluster.setupNginx(join(__dirname, '..'), cluster.port, proto)
    } else {
      throw new Error('端口号不是一个数字')
    }
  }
  const server = cluster.setupExpress(proto === 'https' && !config.enableNginx)
  let checkFileInterval: NodeJS.Timeout
  try {
    logger.info('请求上线')
    await cluster.listen()
    await cluster.enable()

    logger.info(colors.rainbow(`启动完成, 正在提供 ${files.files.length} 个文件`))
    if (nodeCluster.isWorker && typeof process.send === 'function') {
      process.send('ready')
    }

    checkFileInterval = setTimeout(() => {
      void checkFile(files).catch((e) => {
        console.error('检查文件错误')
        console.error(e)
      })
    }, ms('60m'))
  } catch (e) {
    logger.fatal(e)
    if (process.env.NODE_ENV === 'development') {
      logger.fatal('开发模式，不退出')
    } else {
      cluster.exit(1)
    }
  }

  async function checkFile(lastFileList: IFileList): Promise<void> {
    logger.debug('刷新文件')
    try {
      const lastModified = max(lastFileList.files.map((file) => file.mtime))
      const fileList = await cluster.getFileList(lastModified)
      if (fileList.files.length === 0) {
        logger.debug('没有新文件')
        return
      }
      const configuration = await cluster.getConfiguration()
      await cluster.syncFiles(files, configuration.sync)
      lastFileList = fileList
    } finally {
      checkFileInterval = setTimeout(() => {
        checkFile(lastFileList).catch((e) => {
          console.error('检查文件错误')
          console.error(e)
        })
      }, ms('60m'))
    }
  }

  let stopping = false
  const onStop = async (signal: string): Promise<void> => {
    console.log(`搞到 ${signal}, 正在注销集群`)
    if (stopping) {
      // eslint-disable-next-line n/no-process-exit
      process.exit(1)
    }

    stopping = true
    clearTimeout(checkFileInterval)
    if (cluster.interval) {
      clearInterval(cluster.interval)
    }
    await cluster.disable()

    // eslint-disable-next-line no-console
    console.log('注销成功，等待后台任务，crtl+c以强制退出')
    server.close()
    cluster.nginxProcess?.kill()
  }
  process.on('SIGTERM', (signal) => {
    void onStop(signal)
  })
  process.on('SIGINT', (signal) => {
    void onStop(signal)
  })

  if (nodeCluster.isWorker) {
    process.on('disconnect', () => {
      void onStop('disconnect')
    })
  }
}
