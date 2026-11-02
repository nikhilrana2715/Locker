import os
import math
from PIL import Image, ImageDraw, ImageFilter

def generate_quicklock_icon():
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Base drop shadow
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    margin = 36
    sdraw.rounded_rectangle(
        [margin + 6, margin + 20, size - margin + 6, size - margin + 20],
        radius=110,
        fill=(79, 70, 229, 90)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    img.alpha_composite(shadow)

    # 2. Main Clay Shield / Squircle Body with Gradient
    base_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(base_layer)
    bdraw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=110,
        fill=(99, 102, 241, 255)
    )

    # Gradient overlay: Indigo to Violet
    grad = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(grad)
    for y in range(margin, size - margin):
        t = (y - margin) / float(size - 2 * margin)
        # Interpolate from #6366F1 (99, 102, 241) to #7C3AED (124, 58, 237)
        r = int(99 + (124 - 99) * t)
        g = int(102 + (58 - 102) * t)
        b = int(241 + (237 - 241) * t)
        gdraw.line([(margin, y), (size - margin, y)], fill=(r, g, b, 255))
    
    # Mask gradient to rounded rect
    mask = Image.new("L", (size, size), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=110,
        fill=255
    )
    base_layer.paste(grad, (0, 0), mask)

    # Inner bevel / clay highlight (Top-left light)
    highlight = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    hdraw = ImageDraw.Draw(highlight)
    hdraw.rounded_rectangle(
        [margin + 4, margin + 4, size - margin - 4, size - margin - 4],
        radius=106,
        outline=(255, 255, 255, 140),
        width=8
    )
    highlight = highlight.filter(ImageFilter.GaussianBlur(4))
    base_layer.alpha_composite(highlight, (0, 0))
    img.alpha_composite(base_layer)

    # 3. Draw 3D Clay Padlock in Center
    lock_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ldraw = ImageDraw.Draw(lock_layer)

    # Shackle (Arch)
    shackle_left = 186
    shackle_right = 326
    shackle_top = 130
    shackle_bottom = 270
    shackle_width = 38

    # Shackle Outer Arc
    ldraw.arc(
        [shackle_left, shackle_top, shackle_right, shackle_bottom],
        start=180,
        end=0,
        fill=(255, 255, 255, 255),
        width=shackle_width
    )
    # Shackle Legs
    ldraw.rectangle(
        [shackle_left, (shackle_top + shackle_bottom)//2, shackle_left + shackle_width, 270],
        fill=(255, 255, 255, 255)
    )
    ldraw.rectangle(
        [shackle_right - shackle_width, (shackle_top + shackle_bottom)//2, shackle_right, 270],
        fill=(255, 255, 255, 255)
    )

    # Shackle Highlight
    ldraw.arc(
        [shackle_left + 4, shackle_top + 4, shackle_right - 4, shackle_bottom - 4],
        start=180,
        end=0,
        fill=(255, 255, 255, 180),
        width=10
    )

    # Padlock Body (Rounded Rect)
    body_left = 146
    body_top = 236
    body_right = 366
    body_bottom = 406
    body_radius = 48

    # Body drop shadow
    body_shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bsdraw = ImageDraw.Draw(body_shadow)
    bsdraw.rounded_rectangle(
        [body_left, body_top + 10, body_right, body_bottom + 10],
        radius=body_radius,
        fill=(30, 27, 75, 110)
    )
    body_shadow = body_shadow.filter(ImageFilter.GaussianBlur(10))
    lock_layer.alpha_composite(body_shadow)

    # White tactile body
    ldraw.rounded_rectangle(
        [body_left, body_top, body_right, body_bottom],
        radius=body_radius,
        fill=(255, 255, 255, 255)
    )

    # Top highlight on padlock body
    ldraw.rounded_rectangle(
        [body_left + 6, body_top + 4, body_right - 6, body_top + 28],
        radius=14,
        fill=(255, 255, 255, 160)
    )

    # Keyhole in Center of Padlock
    center_x = (body_left + body_right) // 2
    center_y = (body_top + body_bottom) // 2 - 4
    
    # Keyhole circle
    circle_r = 20
    ldraw.ellipse(
        [center_x - circle_r, center_y - circle_r, center_x + circle_r, center_y + circle_r],
        fill=(79, 70, 229, 255)
    )
    # Keyhole slot
    slot_w = 12
    slot_h = 32
    ldraw.polygon(
        [
            (center_x - 10, center_y + 4),
            (center_x + 10, center_y + 4),
            (center_x + 16, center_y + slot_h + 8),
            (center_x - 16, center_y + slot_h + 8),
        ],
        fill=(79, 70, 229, 255)
    )

    img.alpha_composite(lock_layer)
    return img

if __name__ == "__main__":
    out_dir = r"N:\Locker\src-tauri\icons"
    os.makedirs(out_dir, exist_ok=True)
    
    icon_512 = generate_quicklock_icon()
    
    # Save master icon.png (512x512)
    icon_512.save(os.path.join(out_dir, "icon.png"), "PNG")
    print("Saved icon.png (512x512)")
    
    # Save standard sizes
    sizes = [
        ("32x32.png", 32),
        ("128x128.png", 128),
        ("Square30x30Logo.png", 30),
        ("Square44x44Logo.png", 44),
        ("Square71x71Logo.png", 71),
        ("Square89x89Logo.png", 89),
        ("Square107x107Logo.png", 107),
        ("Square142x142Logo.png", 142),
        ("Square150x150Logo.png", 150),
        ("Square284x284Logo.png", 284),
        ("Square310x310Logo.png", 310),
        ("StoreLogo.png", 50),
    ]
    
    for filename, s in sizes:
        resized = icon_512.resize((s, s), Image.Resampling.LANCZOS)
        resized.save(os.path.join(out_dir, filename), "PNG")
        print(f"Saved {filename} ({s}x{s})")
        
    # Generate multi-resolution Windows icon.ico
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_images = [icon_512.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]
    ico_path = os.path.join(out_dir, "icon.ico")
    ico_images[0].save(
        ico_path,
        format="ICO",
        sizes=ico_sizes,
        append_images=ico_images[1:]
    )
    print("Saved multi-resolution icon.ico")
