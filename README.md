# Node-OpenMCIM

这是对 [bangbang93](https://github.com/bangbang93) 的 [OpenBMCLAPI](https://github.com/bangbang93/openbmclapi) 项目的修改版

为了方便上线 OpenMCIM 而修改了部分内容

# 关于OpenMCIM
借鉴 OpenBMCLAPI 使用网盘缓存的先例，旨在为中国大陆用户提供稳定的 Mod 信息镜像服务并解决国内下载 Mod 速度缓慢的问题。

OpenMCIM是对外开放的，所有需要 Minecraft Mod 资源的启动器均可调用。

[OpenMCIM 文件分发相关](https://github.com/mcmod-info-mirror/mcim/issues/91)

## 变量

| 环境变量             |必填 | 默认值        | 说明                                                                                                     |
|---------------------|-----|--------------|--------------------------------------------------------------------------------------------------------|
| CLUSTER_ID          | 是  | -            | 节点 ID                                                                                                  |
| CLUSTER_SECRET      | 是  | -            | 节点密钥                                                                                                   |
| CLUSTER_IP          | 否  | 自动获取公网出口IP   | 用户访问时使用的 IP 或域名                                                                                        |
| CLUSTER_PORT        | 否  | 4000         | 监听端口（本地开放的端口）                                                                                                   |
| CLUSTER_PUBLIC_PORT | 否  | CLUSTER_PORT | 对外端口（用户请求时访问的端口）                                                                                                   |
| CLUSTER_BYOC        | 否  | false        | 是否使用自定义域名, (BYOC=Bring you own certificate),当使用国内服务器需要备案时, 需要启用这个参数来使用你自己的域名, 并且你需要自己提供ssl termination |
| ENABLE_NGINX        | 否  | false        | 使用 nginx 提供文件服务                                                                                        |
| DISABLE_ACCESS_LOG  | 否  | false        | 禁用访问日志输出                                                                                               |
| ENABLE_UPNP         | 否  | false        | 启用 UPNP 端口映射                                                                                           |
| CLUSTER_BMCLAPI     | 否  | https://files.mcimirror.top        | 更改上线地址(测试变量)            |
| CLUSTER_STORAGE     | 否  | files        | 使用其他存储源的类型(默认为本地)            |
| CLUSTER_STORAGE_OPTIONS | 否  | 无        | 挂载其他存储源的配置项            |
| SKIP_FILE_SHA_CHECK | 否  | false          | 防止主控SHA爆炸，强制忽略SHA问题上线 |
| SKIP_SYNC | 否  | false          | 强制跳过所有同步(不推荐) |
| SKIP_GC | 否  | false          | 跳过GC垃圾自动回收(由 **千时雨** 提供) |
| THREADS | 否  | 由主控分配         | 同步线程(改太高会被banban) |

### 如果你在源码中发现了其他环境变量, 那么它们是为了方便开发而存在的, 可能会随时修改, 不要在生产环境中使用！

## Alist使用方法
在.env中加上
```env
CLUSTER_STORAGE=alist
CLUSTER_STORAGE_OPTIONS={"url":"http://127.0.0.1:5244/dav","basePath":"mcim","username":"admin","password":"admin" }
#                                      ↑AList地址(别忘了加/dav)          ↑文件路径         ↑账号(有webdav权限)  ↑密码
```
按照需要修改

### 温馨提示

如从 Go 端迁移至 Node 端，你Alist里面的目录应该是这样的：

```file_tree
mcim/
├── download/
│   ├── 00/
│   ├── 01/
|   ├── 03/
│   └── xx(下面一堆文件夹,不一一列举)/
├── measure/
│   ├── 1
│   ├── 2
│   └── 3
```
此时你basepath的地址就应该填写"mcim/download"

（即确保 Node-OpenMCIM 程序读取的根目录为有效文件所存储目录）


### 安装包

从 [Github Release](https://github.com/ZeroWolf233/node-openmcim/releases) 中下载你系统对应的最新版本

解压，然后根据对应信息，参照上方表格填写.env文件

随后启动脚本，即可开始运行

### 使用Docker

```bash
docker run -d \
-e CLUSTER_ID=${CLUSTER_ID} \
-e CLUSTER_SECRET=${CLUSTER_SECRET} \
-e CLUSTER_PUBLIC_PORT=${CLUSTER_PORT} \
-e TZ=Asia/Shanghai \
-v /data/mcim:/opt/mcim \
-p ${CLUSTER_PORT}:${CLUSTER_PORT} \
--restart unless-stop \
--name mcim \
zerowolf233/mcim
```

### 从源码安装

#### 环境

- Node.js 20 以上
- Windows/MacOS/Linux
- x86/arm 均可 (需支持Nodejs)

#### 设置环境

1. 去 <https://nodejs.org/zh-cn/> 下载LTS版本的nodejs并安装
2. Clone 并安装依赖

```bash
git clone https://github.com/ZeroWolf233/node-openmcim
cd node-openmcim 
## 安装依赖
npm ci
## 编译
npm run build
## 运行
node dist/index.js
```

3. 如果你看到了 `CLUSTER_ID is not set` 的报错, 说明一切正常, 该设置参数了

### 设置参数

在项目根目录创建一个文件, 名为 `.env`

写入如下内容

```env
CLUSTER_ID=你的节点ID
CLUSTER_SECRET=你的节点密钥
CLUSTER_PORT=你的开放端口
# 更多变量请看上方变量的详细解释
```

如果配置无误的话, 运行程序, 就会开始拉取文件, 拉取完成后就会开始等待服务器分发请求了！

## 致谢

- [**bangbang93**](https://github.com/bangbang93) 基本全是照着bangbang93的源码改的，总之谢谢93！
- [**OpenBMCLAPI**](https://github.com/bangbang93/openbmclapi) 项目原型
- [**OpenMCIM**](https://github.com/mcmod-info-mirror/mcim) 大陆Curseforge&Modrinth镜像源
- [**SaltWood**](https://github.com/SALTWOOD) OpenMCIM所用主控
- [**Open93@Home-V3**](https://github.com/SaltWood-Studio/Open93AtHome-V3)
- [**ZeroWolf233**](https://github.com/ZeroWolf233) 作者，但是fw一个
- [**Zhang**](https://github.com/Zhang12334) 项目发起 & 程序改写
- **千时雨** 提供很多对网盘优化的修改思路和代码，虽然暂时还没应用
