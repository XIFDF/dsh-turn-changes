# dsh-turn-changes

为 DeepSeek Harness Desktop 提供逐轮文件审阅。在回复底部集中查看本轮改动的文件、增删行数和逐行差异。

## 功能

- 汇总同一轮的本地和远程文件改动。
- 悬停文件行可预览差异，点击文件可展开完整记录的差异。
- 路径单行显示，目录和文件名用不同颜色区分。
- 有完整前后快照时，将同一远程文件的连续编辑合并为净差异。

## 安装

支持 DeepSeek Harness Desktop `0.2.2-rc.1`。下载 Release 中的 `dsh-turn-changes-1.0.3.tgz`，用 PowerShell 安装并重启 Harness。

```powershell
dsh plugin --profile desktop add 'C:/Downloads/dsh-turn-changes-1.0.3.tgz'
```

从源码安装时，在含有 `package.json` 的插件目录运行：

```powershell
dsh plugin --profile desktop add "link:$((Get-Location).Path)"
```

## 使用

打开对话，在回复底部展开「N 个文件已更改」。悬停文件名预览增删，或点击「审阅」展开列表和首个文件的差异。

本地汇总使用工作区快照和会话中已保存的差异。远程汇总依赖成功的文件操作记录，只有片段时会标明显示范围。远程终端直接写入目前无法计入。重启后，旧轮次的工作区快照可能失效，已保存的工具差异仍可查看。
