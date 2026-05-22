import os
from PIL import Image

def compress_image(filepath, target_quality=75):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
        
    original_size = os.path.getsize(filepath)
    ext = os.path.splitext(filepath)[1].lower()
    
    # Open the image
    with Image.open(filepath) as img:
        # Convert RGBA to RGB if saving as JPEG
        if ext in ['.jpg', '.jpeg']:
            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                img = img.convert('RGB')
            img.save(filepath, 'JPEG', quality=target_quality, optimize=True, progressive=True)
        elif ext == '.png':
            # Quantize png to 256 colors if it's large, or save with optimize
            img = img.convert('P', palette=Image.Palette.ADAPTIVE, colors=256)
            img.save(filepath, 'PNG', optimize=True)
        elif ext == '.webp':
            img.save(filepath, 'WEBP', quality=target_quality, method=6)
            
    new_size = os.path.getsize(filepath)
    reduction = (original_size - new_size) / original_size * 100
    print(f"Compressed {os.path.basename(filepath)}: {original_size/1024:.1f}KB -> {new_size/1024:.1f}KB ({reduction:.1f}% reduction)")

if __name__ == "__main__":
    assets_dir = r"c:\Users\yura3\Documents\Repositories\B&W Prod\bnw-website\public\assets"
    
    # 1. Compress hero.jpeg (Crucial!)
    hero_path = os.path.join(assets_dir, "hero.jpeg")
    compress_image(hero_path, target_quality=75)
    
    # 2. Compress other PNGs/WebPs
    pngs = ["exp-strategy.png", "exp-tech.png", "exp-traffic.png", "expert-stas.png", "victor.png"]
    for png in pngs:
        path = os.path.join(assets_dir, png)
        compress_image(path, target_quality=75)
        
    print("Optimization completed!")
