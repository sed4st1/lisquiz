import os
from collections import deque
from PIL import Image

def make_transparent_from_edges(im_rgba, tolerance=25):
    """
    Floods from image borders to make external near-white pixels transparent,
    preserving any white details inside the artwork.
    """
    w, h = im_rgba.size
    pixels = im_rgba.load()
    visited = set()
    queue = deque()

    # Seed all border pixels
    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(h):
        queue.append((0, y))
        queue.append((w - 1, y))

    def is_bg(x, y):
        r, g, b, a = pixels[x, y]
        return r >= (255 - tolerance) and g >= (255 - tolerance) and b >= (255 - tolerance)

    while queue:
        x, y = queue.popleft()
        if (x, y) in visited:
            continue
        visited.add((x, y))

        if is_bg(x, y):
            pixels[x, y] = (255, 255, 255, 0)
            for nx, ny in [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]:
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                    if is_bg(nx, ny):
                        queue.append((nx, ny))

    return im_rgba

def crop_tight(im_rgba):
    alpha = im_rgba.getchannel("A")
    bbox = alpha.getbbox()
    if bbox:
        # Pad with 4px
        w, h = im_rgba.size
        x1, y1, x2, y2 = bbox
        x1 = max(0, x1 - 4)
        y1 = max(0, y1 - 4)
        x2 = min(w, x2 + 4)
        y2 = min(h, y2 + 4)
        return im_rgba.crop((x1, y1, x2, y2))
    return im_rgba

def slice_grid(src_path, dest_dir, names):
    im = Image.open(src_path).convert("RGBA")
    cell_w = 512
    cell_h = 512

    for row in range(2):
        for col in range(3):
            idx = row * 3 + col
            name = names[idx]
            box = (col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h)
            cell = im.crop(box)
            cell = make_transparent_from_edges(cell, tolerance=20)
            cell = crop_tight(cell)
            out_path = os.path.join(dest_dir, f"{name}.png")
            cell.save(out_path, "PNG")
            print(f"Saved: {out_path} ({cell.size})")

def slice_mascot_emotions():
    src = "образцы дизайна/эмоции маскота.png"
    im = Image.open(src).convert("RGBA")
    dest_dir = "frontend/public/assets/mascot"
    
    # Pre-calculated bounds from alpha channel
    bounds = [
        ("celebrate", (14, 188, 412, 699)),
        ("thinking", (444, 213, 762, 688)),
        ("dash", (770, 270, 1238, 651)),
        ("wave", (1270, 207, 1654, 687))
    ]
    
    for name, (x1, y1, x2, y2) in bounds:
        crop = im.crop((x1, y1, x2, y2))
        out_path = os.path.join(dest_dir, f"{name}.png")
        crop.save(out_path, "PNG")
        print(f"Saved mascot: {out_path} ({crop.size})")

def slice_app_icon():
    src = "образцы дизайна/маскот лисквиз.jpeg"
    im = Image.open(src).convert("RGBA")
    dest_dir = "frontend/public/assets/mascot"
    # App icon is in bottom right: let us crop the rounded square icon
    # Dimensions: image is (1280, 853)
    # The green app icon is in bottom right roughly x: 850..1200, y: 550..850
    icon_crop = im.crop((880, 595, 1180, 845))
    icon_crop = make_transparent_from_edges(icon_crop, tolerance=20)
    icon_crop = crop_tight(icon_crop)
    out_path = os.path.join(dest_dir, "app_icon.png")
    icon_crop.save(out_path, "PNG")
    print(f"Saved app icon: {out_path} ({icon_crop.size})")

def copy_backgrounds():
    import shutil
    shutil.copy("образцы дизайна/фон.png", "frontend/public/assets/backgrounds/forest_night.png")
    shutil.copy("образцы дизайна/роща.png", "frontend/public/assets/backgrounds/class_grove.png")
    print("Copied backgrounds to frontend/public/assets/backgrounds/")

if __name__ == "__main__":
    print("--- Slicing Teacher Avatars ---")
    slice_grid(
        "образцы дизайна/учителя.png",
        "frontend/public/assets/avatars/teachers",
        ["badger", "owl", "deer", "bear", "cat", "fox"]
    )

    print("\n--- Slicing Student Avatars ---")
    slice_grid(
        "образцы дизайна/a_clean_flat_vector_cute_cartoon_illustration_on.png",
        "frontend/public/assets/avatars/students",
        ["hedgehog", "raccoon", "bear", "owl", "bunny", "squirrel"]
    )

    print("\n--- Slicing Mascot Emotions ---")
    slice_mascot_emotions()

    print("\n--- Slicing App Icon ---")
    slice_app_icon()

    print("\n--- Copying Backgrounds ---")
    copy_backgrounds()

    print("\nDone!")
