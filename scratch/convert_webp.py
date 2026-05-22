import os
from PIL import Image

def convert_to_webp(filepath, quality=75):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
        
    original_size = os.path.getsize(filepath)
    filename = os.path.basename(filepath)
    name, ext = os.path.splitext(filename)
    dirname = os.path.dirname(filepath)
    
    webp_path = os.path.join(dirname, f"{name}.webp")
    
    with Image.open(filepath) as img:
        # Convert RGBA/P to RGB if needed, or save with alpha channel
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            img.save(webp_path, 'WEBP', quality=quality, method=6)
        else:
            img.convert('RGB').save(webp_path, 'WEBP', quality=quality, method=6)
            
    webp_size = os.path.getsize(webp_path)
    reduction = (original_size - webp_size) / original_size * 100
    print(f"Converted {filename} -> {name}.webp: {original_size/1024:.1f}KB -> {webp_size/1024:.1f}KB ({reduction:.1f}% reduction)")

if __name__ == "__main__":
    assets_dir = r"c:\Users\yura3\Documents\Repositories\B&W Prod\bnw-website\public\assets"
    
    # Files to convert
    files = ["hero.jpeg", "exp-strategy.png", "exp-tech.png", "exp-traffic.png", "expert-stas.png", "victor.png"]
    for filename in files:
        path = os.path.join(assets_dir, filename)
        convert_to_webp(path, quality=70) # Quality 70 is excellent for web
        
    print("WebP Conversion completed!")
