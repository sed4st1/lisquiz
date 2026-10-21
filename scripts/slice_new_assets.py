"""
Скрипт нарезки новых 3D-ассетов для «Лисквиз»
1. Нарезка 4 стадий Рощи (Семя -> Саженец -> Дуб -> Вековой Дуб)
2. Нарезка 4 игровых иконок (Жёлудь, Сундук, Огонь серии, Кубок)
3. Подготовка фонов отдыха со спящим Спринтом
"""

import os
from collections import deque
from PIL import Image

def remove_bg_floodfill(img, tolerance=22):
    """Качественное удаление белого фона через floodfill с сохранением внутренних бликов"""
    img = img.convert('RGBA')
    iw, ih = img.size
    pixels = img.load()
    visited = bytearray(iw * ih)
    queue = deque()
    
    # Семена по краям изображения
    for x in range(iw):
        queue.append((x, 0))
        queue.append((x, ih - 1))
        visited[0 * iw + x] = 1
        visited[(ih - 1) * iw + x] = 1
    for y in range(ih):
        queue.append((0, y))
        queue.append((iw - 1, y))
        visited[y * iw + 0] = 1
        visited[y * iw + (iw - 1)] = 1
        
    def is_bg(r, g, b):
        return r >= (255 - tolerance) and g >= (255 - tolerance) and b >= (255 - tolerance)
        
    while queue:
        x, y = queue.popleft()
        r, g, b, a = pixels[x, y]
        if is_bg(r, g, b):
            pixels[x, y] = (r, g, b, 0)
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < iw and 0 <= ny < ih:
                    idx = ny * iw + nx
                    if not visited[idx]:
                        visited[idx] = 1
                        nr, ng, nb, _ = pixels[nx, ny]
                        if is_bg(nr, ng, nb):
                            queue.append((nx, ny))
                            
    bbox = img.getbbox()
    if bbox:
        p_bbox = (max(0, bbox[0]-10), max(0, bbox[1]-10), min(iw, bbox[2]+10), min(ih, bbox[3]+10))
        img = img.crop(p_bbox)
    return img

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    samples_dir = os.path.join(root, 'образцы дизайна')
    public_assets = os.path.join(root, 'frontend', 'public', 'assets')

    # 1. 4 стадии дерева
    stages_path = os.path.join(samples_dir, 'роща поэтапно.png')
    if os.path.exists(stages_path):
        os.makedirs(os.path.join(public_assets, 'grove'), exist_ok=True)
        im = Image.open(stages_path)
        w, h = im.size
        stages = {
            'tree_stage_1': (0, 0, 280, h),
            'tree_stage_2': (315, 0, 595, h),
            'tree_stage_3': (630, 0, 1045, h),
            'tree_stage_4': (1085, 0, w, h)
        }
        for name, box in stages.items():
            crop = im.crop(box)
            processed = remove_bg_floodfill(crop)
            out_file = os.path.join(public_assets, 'grove', f'{name}.png')
            processed.save(out_file, 'PNG')
            print(f'✅ Сохранена стадия дерева: {out_file} ({processed.size})')

    # 2. 4 сочные иконки
    icons_path = os.path.join(samples_dir, 'огонь, кубок, сундук.png')
    if os.path.exists(icons_path):
        os.makedirs(os.path.join(public_assets, 'icons'), exist_ok=True)
        im = Image.open(icons_path)
        w, h = im.size
        quads = {
            'acorn': (0, 0, 610, 605),
            'chest': (610, 0, w, 605),
            'flame': (0, 605, 610, h),
            'trophy': (610, 605, w, h)
        }
        for name, box in quads.items():
            crop = im.crop(box)
            processed = remove_bg_floodfill(crop)
            out_file = os.path.join(public_assets, 'icons', f'{name}.png')
            processed.save(out_file, 'PNG')
            print(f'✅ Сохранена иконка: {out_file} ({processed.size})')

    # 3. Спящий Спринт (zzz.png)
    zzz_path = os.path.join(samples_dir, 'zzz.png')
    if os.path.exists(zzz_path):
        im = Image.open(zzz_path)
        out_bg = os.path.join(public_assets, 'backgrounds', 'sleep_screen.png')
        im.save(out_bg, 'PNG')
        print(f'✅ Сохранен экран сна: {out_bg}')

    # 4. Валюта и пустой слот (пустой желудь, звезда, кристалл.png)
    currency_path = os.path.join(samples_dir, 'пустой желудь, звезда, кристалл.png')
    if os.path.exists(currency_path):
        os.makedirs(os.path.join(public_assets, 'icons'), exist_ok=True)
        im = Image.open(currency_path)
        w, h = im.size
        items = {
            'acorn_slot': (0, 0, 415, h),
            'crystal': (415, 0, 835, h),
            'star_medal': (835, 0, w, h)
        }
        for name, box in items.items():
            crop = im.crop(box)
            processed = remove_bg_floodfill(crop)
            out_file = os.path.join(public_assets, 'icons', f'{name}.png')
            processed.save(out_file, 'PNG')
            print(f'✅ Сохранена иконка: {out_file} ({processed.size})')

    # 5. Деревянные таблички (таблички.png)
    signs_path = os.path.join(samples_dir, 'таблички.png')
    if os.path.exists(signs_path):
        os.makedirs(os.path.join(public_assets, 'ui'), exist_ok=True)
        im = Image.open(signs_path)
        w, h = im.size
        signs = {
            'sign_hanging': (0, 0, 730, 640),
            'sign_square': (730, 0, w, 640),
            'board_wide': (0, 640, w, 970),
            'banner_ribbon': (0, 970, w, h)
        }
        for name, box in signs.items():
            crop = im.crop(box)
            processed = remove_bg_floodfill(crop)
            out_file = os.path.join(public_assets, 'ui', f'{name}.png')
            processed.save(out_file, 'PNG')
            print(f'✅ Сохранена табличка UI: {out_file} ({processed.size})')

if __name__ == '__main__':
    main()
