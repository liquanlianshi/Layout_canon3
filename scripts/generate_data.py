# -*- coding: utf-8 -*-
"""
Generate the default *synthetic* demo dataset for the
"New Quality Productive Forces (NQPF) & Social Development" website.

The numbers are SIMULATED for demonstration / teaching purposes only
(they are not official statistics). Deterministic output: a fixed seed
is used so the generated files can be reproduced exactly.

Outputs
-------
  data/nqpf_long.csv   long / tidy table  (year, region, indicator, value, unit)
  data/nqpf_wide.csv   wide table         (year, region, <indicator_en>...)
  js/data.js           compact data embedded for offline file:// use
"""
import csv
import json
import math
import os
import random

random.seed(20241009)

YEARS = list(range(2015, 2025))

# key, zh name, en name, unit(zh), unit(en), direction(up/down), unit_factor
INDICATORS = [
    ("rd_intensity",   "研发投入强度",           "R&D Intensity",              "%",        "%",         "up",   1.0),
    ("patents_per10k", "每万人发明专利授权量",   "Invention Patents / 10k",    "件",       "count",     "up",   1.0),
    ("digital_share",  "数字经济核心产业占比",   "Digital Economy Share",      "%",        "%",         "up",   1.0),
    ("labor_prod",     "全员劳动生产率",         "Labor Productivity",         "万元/人",  "10k CNY/pp", "up",  1.0),
    ("energy_intensity","单位GDP能耗",           "Energy Intensity",           "吨标煤/万元","tce/10k CNY","down",1.0),
    ("clean_energy",   "清洁能源装机占比",       "Clean Energy Capacity Share","%",        "%",         "up",   1.0),
    ("income",         "居民人均可支配收入",     "Per-capita Disposable Income","元",      "CNY",       "up",   1.0),
    ("hightech",       "高新技术企业数",         "High-tech Enterprises",      "家",       "firms",     "up",   1.0),
    ("new_jobs",       "城镇新增就业",           "New Urban Jobs",             "万人",     "10k",       "up",   1.0),
    ("internet",       "互联网普及率",           "Internet Penetration",       "%",        "%",         "up",   1.0),
    ("edu_years",      "平均受教育年限",         "Avg. Years of Schooling",    "年",       "years",     "up",   1.0),
]

# baseline = 2015 value for each region: (rd, patent, digital, prod, energy, clean, income, hightech, jobs, internet, edu)
BASE = {
    "北京": (5.9, 55.0, 32.0, 22.0, 0.25, 12.0, 52000, 11000, 35.0, 78.0, 11.5),
    "上海": (3.7, 38.0, 28.0, 24.0, 0.32, 10.0, 50000,  8200, 40.0, 75.0, 11.0),
    "广东": (2.5, 22.0, 26.0, 14.0, 0.40, 11.0, 28000, 12000, 90.0, 72.0,  9.6),
    "江苏": (2.6, 25.0, 22.0, 15.0, 0.42, 12.0, 29500, 10500, 70.0, 70.0,  9.8),
    "浙江": (2.4, 24.0, 24.0, 15.0, 0.40, 13.0, 35500,  9000, 65.0, 76.0,  9.7),
    "山东": (2.1, 12.0, 15.0, 12.0, 0.55,  9.0, 24500,  6000, 75.0, 65.0,  9.0),
    "四川": (1.7, 10.0, 13.0,  9.0, 0.55, 14.0, 19000,  3500, 60.0, 62.0,  8.7),
    "湖北": (1.9, 12.0, 14.0, 10.0, 0.52, 12.0, 20500,  4200, 50.0, 63.0,  9.1),
    "陕西": (2.0, 13.0, 12.0, 10.0, 0.60, 10.0, 17500,  3000, 45.0, 60.0,  9.0),
    "贵州": (0.8,  4.0,  8.0,  6.0, 0.75, 20.0, 13500,  1200, 30.0, 52.0,  8.2),
}

# growth model per indicator -> value(index t=0..9)
def curve(key, base, t):
    if key == "rd_intensity":    return base * (1.032 ** t)
    if key == "patents_per10k":  return base * (1.130 ** t)
    if key == "digital_share":   return base + (base * 0.95) * ((t / 9.0) ** 1.15)
    if key == "labor_prod":      return base * (1.055 ** t)
    if key == "energy_intensity":return base * (0.965 ** t)
    if key == "clean_energy":    return base + 18.0 * ((t / 9.0) ** 1.30)
    if key == "income":          return base * (1.065 ** t)
    if key == "hightech":        return base * (1.160 ** t)
    if key == "new_jobs":        return base * (1 + 0.012 * t)
    if key == "internet":        return base + (97.0 - base) * ((t / 9.0) ** 0.80)
    if key == "edu_years":       return base + 0.12 * t
    raise KeyError(key)


def gen_series():
    """series[key][region] -> list of 10 values aligned with YEARS"""
    series = {k: {} for k, *_ in INDICATORS}
    for region, bases in BASE.items():
        for i, (key, *_rest) in enumerate(INDICATORS):
            base = bases[i]
            vals = []
            for t in range(len(YEARS)):
                v = curve(key, base, t)
                v *= 1.0 + random.uniform(-0.018, 0.018)   # small noise
                vals.append(round(v, 3))
            series[key][region] = vals
    return series


def write_csvs(series):
    os.makedirs("data", exist_ok=True)
    regions = list(BASE.keys())
    # long / tidy
    with open("data/nqpf_long.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["year", "region", "indicator", "indicator_en", "value", "unit"])
        for yi, year in enumerate(YEARS):
            for region in regions:
                for key, zh, en, unit_zh, unit_en, _d, _f in INDICATORS:
                    w.writerow([year, region, key, en, series[key][region][yi], unit_zh])
    # wide
    with open("data/nqpf_wide.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["year", "region"] + [k for k, *_ in INDICATORS])
        for yi, year in enumerate(YEARS):
            for region in regions:
                w.writerow([year, region] + [series[k][region][yi] for k, *_ in INDICATORS])
    print("wrote data/nqpf_long.csv and data/nqpf_wide.csv")


def write_js(series):
    payload = {
        "years": YEARS,
        "regions": list(BASE.keys()),
        "indicators": [
            {"key": k, "zh": zh, "en": en, "unitZh": uz, "unitEn": ue, "dir": d}
            for k, zh, en, uz, ue, d, _f in INDICATORS
        ],
        "series": series,
    }
    os.makedirs("js", exist_ok=True)
    with open("js/data.js", "w", encoding="utf-8") as f:
        f.write("/* Auto-generated by scripts/generate_data.py — SYNTHETIC demo data. */\n")
        f.write("window.NQPF = ")
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print("wrote js/data.js")


if __name__ == "__main__":
    s = gen_series()
    write_csvs(s)
    write_js(s)
