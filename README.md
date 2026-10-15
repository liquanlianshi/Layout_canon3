# 新质生产力 × 社会发展 · 数据可视化网站
# New Quality Productive Forces × Social Development — Data Visualisation Site

> 一个纯静态、可离线运行的双语网站：用数据图形展示**新质生产力对社会发展的带动作用**，
> 并提供一个把 **pandas 常用操作可视化**的数据分析工作台。
> 界面采用**低饱和度鲜艳配色 + 玻璃拟态**（磨砂玻璃面板与彩色光斑背景）。
>
> A fully static, offline-ready bilingual website: data-driven graphics show **how new
> quality productive forces lift social development**, plus an analysis workbench that
> re-implements everyday **pandas operations visually**.

---

## 1. 快速开始 / Quick start

无需安装、无需构建、无需联网（图表库已随项目分发）。

| 方式 | 操作 |
| --- | --- |
| 最简单 | 双击 `index.html` 用浏览器打开 |
| 推荐（可上传本地文件） | 在本目录执行 `python -m http.server 8000`，浏览器访问 <http://localhost:8000/> |
| 部署 | 把整个文件夹上传到任意静态托管（GitHub Pages / 校园服务器 / Nginx），入口 `index.html` |

> 上传 CSV、读取 `data/*.csv` 等能力在 `http(s)://` 下更完整；`file://` 双击打开时
> 仍可使用默认数据、全部分析与可视化功能。

---

## 2. 网站内容 / What the site contains

### 2.1 可视化总览（`nav.overview`）
全部图形由默认数据**实时计算**（均值、2015=100 指数、min-max 标准化、Pearson 相关、最小二乘回归），
没有一张图是写死的。

| # | 图表 | 说明 | 关键计算 |
| --- | --- | --- | --- |
| 1 | KPI 卡片 ×4 | 劳动生产率、数字经济占比、居民收入、单位GDP能耗 | 全国均值 + 相对 2015 变化率 + sparkline |
| 2 | 综合指数趋势 | 新质生产力指数 × 社会发展指数 | 5+5 项指标标准化后合成，2015=100 |
| 3 | 要素→成效桑基图 | 研发/数字/绿色/人才 → 生产率/收入/就业/数字普惠 | 边权重 = 真实 Pearson 相关系数 ×100 |
| 4 | 地区雷达 | 6 维能力对比，可点击切换地区 | min-max 标准化 0–100 |
| 5 | 研发 × 生产率气泡图 | 气泡大小 = 数字经济占比 | 最小二乘趋势线 |
| 6 | 地区 × 指标热力图 | 9 指标 × 10 地区 | 标准化得分 |
| 7 | 高新技术企业排名 | 横向条形 | 2024 年排序 |
| 8 | 数字经济占比十年动画 | timeline 逐帧播放 | 10 年 × 10 地区 |
| 9 | 指标相关矩阵 | 11 × 11 | Pearson r |
| 10 | 绿色能源玫瑰图 | 清洁能源装机占比 | 2024 年 |
| 11 | 收入 × 数字化双轴 | 双 Y 轴折线 | 全国均值 |
| 12 | 2015 vs 2024 对比 | 归一化倍数 | 2015=100 |
| 13 | **全部指标速览** | 11 张迷你趋势卡（一屏看完全部指标） | 每项指标的十年 sparkline + 相对 2015 变化率 |
| 14 | **新质生产力指数仪表** | 2024 年指数读数 | ECharts gauge，2015=100 基线 |
| 15 | **单位GDP能耗十年下降** | 3 个代表地区 + 全国均值虚线 | 越低越好的逆向指标 |
| 16 | **就业 × 高新技术企业** | 柱线双轴组合图 | 全国总量 |

### 2.2 数据分析工作台（`nav.workbench`）
把 pandas 的日常流程做成了**可点击的可视化操作**，每一步都会：
① 更新数据表；② 重画图表；③ 记下等价的 pandas 代码。

| pandas | 网站上的操作 |
| --- | --- |
| `pd.read_csv()` | 数据源面板：默认数据集 / 上传 CSV·TSV / 拖拽 / 粘贴文本 |
| `df.head(n)` | 「抽样行数 (head)」 |
| `df.info()` | 数据视图上方的 meta 条（shape / 内存 / 列类型 / 数值列数） |
| 数据质量诊断 | 「数据健康」面板：逐列完整度进度条、类型、唯一值数，并汇总缺失单元格与重复行 |
| `df.query("...")` | 「筛选」输入框，支持 `and or not`、`& \| ~`、`in [...]`、函数 `abs/round/sqrt/log/...` |
| `df.sort_values(by, ascending=)` | 「排序」+ 升序/降序 |
| `df[[cols]]` | 「选择列」chips |
| `df.dropna()` / `df.fillna(mean)` | 对应两个按钮 |
| `df.drop_duplicates()` | 「去重」 |
| `df.assign(新列=表达式)` | 「计算新列」，表达式按行求值（如 `value / 1000`） |
| `df.groupby([...])["col"].mean()` | 「分组与聚合」：多选分组字段 + 聚合列 + 8 种聚合函数 |
| `df.pivot_table(index, columns, values, aggfunc)` | 「透视表」三个下拉框 |
| `df.describe()` | 「统计描述」按钮 → 统计卡片 + 8 行统计表 |
| `df["col"].value_counts()` | 「频次统计」 |
| `df.corr()` | 「相关性 corr()」热力图 |
| `df["col"].plot.hist(bins=12)` | 「分布直方图」 |
| `df.plot(kind=...)` | 图表类型：折线 / 柱状 / 堆积面积 / 环形 / 散点 / 箱线 |
| `df.to_csv()` | 「导出当前结果 CSV」 |

**表达式安全**：筛选与计算列由一个手写的递归下降解析器处理（词法 → 语法 → 逐行求值），
**不使用 `eval` / `new Function`**，未知列或语法错误会给出提示而不是让页面崩溃。

---

## 3. 数据集 / Dataset

`data/nqpf_long.csv`（长表 1100 行）、`data/nqpf_wide.csv`（宽表 100 行）、
`js/data.js`（内嵌副本，保证 `file://` 直开可用）三份内容完全一致，由
`scripts/generate_data.py` 以固定随机种子生成，可完整复现。

> ⚠️ **演示数据声明**：数据为**教学用合成数据**，非官方统计口径，仅用于展示分析流程与可视化方法。
> The figures are **synthetic demo data for teaching**, not official statistics.

尺度：**10 个地区 × 11 项指标 × 2015–2024 年**。

| 维度 | 指标 |
| --- | --- |
| 科技创新 | 研发投入强度、每万人发明专利授权量、高新技术企业数 |
| 数字经济 | 数字经济核心产业占比、互联网普及率 |
| 绿色转型 | 清洁能源装机占比、单位GDP能耗（越低越好） |
| 效率与人才 | 全员劳动生产率、平均受教育年限 |
| 民生 | 居民人均可支配收入、城镇新增就业 |

---

## 4. 目录结构 / Project layout

```
├── index.html              单页应用（总览 + 工作台两个视图）
├── css/style.css           设计系统：低饱和度鲜艳配色 / 卡片布局 / 响应式
├── js/
│   ├── data.js             默认数据集（由脚本生成）
│   ├── i18n.js             中英文字典 + 语言切换（data-i18n 自动翻译）
│   ├── core.js             调色板、ECharts 主题、格式化、图表实例与 toast
│   ├── dataframe.js        DataFrame：query/sort/groupby/pivot/describe/corr/…
│   ├── overview.js         总览页的 11 张图（全部由数据计算）
│   ├── workbench.js        工作台交互与图表联动
│   └── app.js              路由、语言、初始化
├── data/                   默认数据集（long / wide 两份 CSV）
├── vendor/                 echarts.min.js、papaparse.min.js（离线自包含）
├── scripts/
│   ├── generate_data.py    数据集生成脚本
│   ├── make_speech_doc.py  生成四分钟视频讲解文稿（.docx）
│   └── stats.py            项目清单与 i18n 统计
├── 视频讲解文稿-4分钟.docx  演示视频讲稿（分镜 + 口播 + 连读版）
└── tests/                  pytest 自动化测试（无头渲染、交互回放、文稿校验）
```

---

## 5. 双语与设计 / Bilingual & design

* **中英双语，内容一致**：所有界面文案集中在 `js/i18n.js`（中英各 178 个键），
  `tests/test_static_checks.py` 会断言两本字典的**键集合完全相同**，缺失即测试失败；
  操作记录与错误提示同样以键+参数存储，切换语言后会整段重绘。地区名、指标名、单位也成对定义。
* **配色**：九色低饱和度调色板（明度 66–75%、饱和度 24–42%），颜色鲜艳但不刺眼；
  同一套色板同时驱动 CSS 与 ECharts 主题，保证图表与界面一致。
* **玻璃拟态**：页面底色由六层低饱和度径向渐变光斑构成，顶栏、卡片、面板统一使用
  `backdrop-filter: blur(20px) saturate(1.8)` + 半透明白 + 白色高光边框 + 内侧高光，
  形成磨砂玻璃质感；图表背景保持透明，因此背景色会透过面板自然渗入。
* **少文字**：页面以图形和数字为主，文字只承担标题与必要说明。

---

## 6. 测试 / Tests

```bash
python -m pip install pytest esprima quickjs python-docx
python -m pytest tests -q
```

58 个测试用例，分六层：

| 文件 | 覆盖内容 |
| --- | --- |
| `tests/test_dataset.py` | 长表/宽表/内嵌 JS 三方数据逐值一致、指标元数据、升降方向 |
| `tests/test_static_checks.py` | 全部 JS 语法解析（esprima）、中英字典键一致（178 键）、文案非空 |
| `tests/test_dom_contract.py` | JS 引用的元素 id 都存在、i18n 键都已定义、资源引用与加载顺序 |
| `tests/test_dataframe_js.py` | 在 **quickjs** 里执行 `dataframe.js`，验证 query/groupby/pivot/describe/corr 的返回值，并回归 `__proto__` 列名不丢失 |
| `tests/test_render.py` | 在 mock DOM + mock ECharts 下**真实运行** `overview.js`/`workbench.js`，回放筛选、分组、透视、新增列、排序、描述统计、相关、直方图、频次统计、列投影、重置、英文切换，并验证新增的指标速览/仪表/能耗/就业图表与「数据健康」面板 |
| `tests/test_speech_doc.py` | 读回生成的 `.docx`，校验分镜表结构、时间码覆盖 0:00–4:00、时长合计 240 秒、口播字数落在四分钟区间 |

---

## 7. 技术栈 / Tech stack

* 原生 HTML / CSS / JavaScript（ES5 语法，无需构建工具与 Node.js）
* [Apache ECharts 5.5.1](https://echarts.apache.org/)（本地 `vendor/`）
* [PapaParse 5.4.1](https://www.papaparse.com/)（本地 `vendor/`）
* 自定义 DataFrame 与表达式解析器（`js/dataframe.js`）

---

## 8. 提交物对照 / Deliverables

| 作业要求 | 交付 |
| --- | --- |
| 一个网页链接 | 将本目录部署到任意静态托管后的地址 |
| 网站源代码（压缩包） | 本目录（含 `vendor/`，可离线运行） |
| 视频 | 讲解文稿见 `视频讲解文稿-4分钟.docx`（10 个分镜 · 0:00–4:00 · 含连读版），按稿录制即成片 |
| 一个说明文档 | 本文件 |
