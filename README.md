# DSH Turn Changes

DeepSeek Harness Desktop `0.2.2-rc.1` 的逐轮文件审阅插件。每轮回复底部显示改动文件数和增删行数。展开列表后，悬停文件行可预览差异，点击文件可展开逐行差异。目录和文件名在同一行以不同颜色显示。

在插件目录运行安装命令，然后重新打开 Harness。

```powershell
dsh plugin --profile desktop add "link:$((Get-Location).Path)"
```

本地改动优先使用 Harness 的工作区快照，快照可用时也能显示终端产生的改动。会话已保存的工具差异可用于回看。远程支持 `rw_edit`、`rw_write_file` 和 `rw_append`。有完整快照时，相连的修改合并为净差异。原版 dsh-remote 只返回操作摘要时，面板展示工具记录中的替换片段、追加内容或写入内容，并省略无法准确计算的行数。

远程终端和 `rw_exec` 的写入需要额外的远程快照才能计入。Harness 重启后，旧轮次的本地工作区快照可能失效。此时面板仍可显示保存过的工具差异。
