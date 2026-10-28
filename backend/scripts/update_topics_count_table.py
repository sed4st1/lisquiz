# -*- coding: utf-8 -*-
"""
Генератор файлов TOPICS_COUNT_TABLE.md и topics_count.csv
на основе актуальных данных FRP_CURRICULUM_DATABASE.
"""
import sys, csv, os
sys.path.insert(0, os.path.abspath("."))
from collections import defaultdict
from backend.app.services.curriculum_catalog import FRP_CURRICULUM_DATABASE

# 1. Сбор статистики (subject -> grade -> count & topics)
data = defaultdict(lambda: defaultdict(list))
all_grades = list(range(1, 12))

for item in FRP_CURRICULUM_DATABASE:
    subj = item.get("subject", "Не указан")
    grade = item.get("grade")
    data[subj][grade].append(item)

sorted_subjects = sorted(data.keys())

# 2. Построение CSV
with open("topics_count.csv", "w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f)
    header = ["Предмет"] + [f"{g} класс" for g in all_grades] + ["ИТОГО"]
    writer.writerow(header)

    total_by_grade = defaultdict(int)
    total_all = 0

    for subj in sorted_subjects:
        row = [subj]
        subj_total = 0
        for g in all_grades:
            cnt = len(data[subj].get(g, []))
            row.append(str(cnt) if cnt > 0 else "")
            subj_total += cnt
            total_by_grade[g] += cnt
        row.append(str(subj_total))
        total_all += subj_total
        writer.writerow(row)

    total_row = ["ИТОГО"] + [str(total_by_grade[g]) for g in all_grades] + [str(total_all)]
    writer.writerow(total_row)

print("topics_count.csv обновлен.")

# 3. Построение Markdown таблицы
md_lines = []
md_lines.append("# Сводная таблица количества тем по классам и предметам\n")
md_lines.append("Официальные данные Федеральных рабочих программ (ФРП РФ edsoo.ru), внесенные в базу LisiyQuiz.\n")
md_lines.append("## Сводная матрица (Предмет × Класс)\n")

header_md = "| Предмет | " + " | ".join(f"{g} кл" for g in all_grades) + " | ИТОГО |"
divider_md = "|:---| " + " | ".join(":---:" for _ in all_grades) + " |:---:|"
md_lines.append(header_md)
md_lines.append(divider_md)

for subj in sorted_subjects:
    subj_total = sum(len(data[subj].get(g, [])) for g in all_grades)
    cols = [subj]
    for g in all_grades:
        cnt = len(data[subj].get(g, []))
        cols.append(str(cnt) if cnt > 0 else "-")
    cols.append(f"**{subj_total}**")
    md_lines.append("| " + " | ".join(cols) + " |")

# Итоговая строка
total_cols = ["**ИТОГО**"]
for g in all_grades:
    total_cols.append(f"**{total_by_grade[g]}**")
total_cols.append(f"**{total_all}**")
md_lines.append("| " + " | ".join(total_cols) + " |\n")

md_lines.append("---\n")
md_lines.append("## Детализация по предметам и классам\n")
md_lines.append("| Предмет | Класс | Количество тем | Примеры ключевых тем |")
md_lines.append("| :--- | :---: | :---: | :--- |")

for subj in sorted_subjects:
    for g in all_grades:
        items = data[subj].get(g, [])
        if not items:
            continue
        cnt = len(items)
        # Примеры тем: берем до 2-х тем
        examples = "; ".join(it["topic"][:60] + ("..." if len(it["topic"]) > 60 else "") for it in items[:2])
        md_lines.append(f"| {subj} | {g} | **{cnt}** | {examples} |")

md_lines.append(f"\n**Общее количество тем в базе:** **{total_all}**\n")

with open("TOPICS_COUNT_TABLE.md", "w", encoding="utf-8") as f:
    f.write("\n".join(md_lines))

print(f"TOPICS_COUNT_TABLE.md обновлен. Всего тем: {total_all}")
