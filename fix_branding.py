import os
import re

dir_path = 'src/components/screens'
updated_count = 0

for root, dirs, files in os.walk(dir_path):
    for file in files:
        if file.endswith('.tsx'):
            file_path = os.path.join(root, file)
            with open(file_path, 'r') as f:
                content = f.read()
            
            original_content = content
            
            # Find the absolute top-10 left-10 block
            # Since it might span multiple lines, let's just do targeted replacements:
            
            # 1. Change top-10 left-10 to top-8 left-8 to give more room from center
            content = re.sub(r'absolute top-10 left-10', r'absolute top-8 left-8', content)
            
            # 2. Change h-6 to h-9 or h-10 for the logo
            content = re.sub(r'<img src="/logo.svg"([^>]*)className="h-6', r'<img src="/logo.svg"\1className="h-10', content)
            
            # 3. Remove the subtitle span that follows the logo. 
            # Usually it looks like:
            # <img ... />
            # <span className="text-[10px] ...">Subtitle</span>
            # We can match <img src="/logo.svg" ... />\s*<span[^>]*text-\[10px\][^>]*>.*?</span>
            
            content = re.sub(
                r'(<img src="/logo.svg"[^>]*>)\s*<span[^>]*text-\[10px\][^>]*>.*?</span>',
                r'\1',
                content,
                flags=re.DOTALL
            )
            
            # Some spans might not have text-[10px], let's also catch text-[xs] or anything right after the img if it's in gap-1 flex col.
            # Or we can just catch <span[^>]*uppercase tracking-[^>]*>.*?</span>
            content = re.sub(
                r'(<img src="/logo.svg"[^>]*>)\s*<span[^>]*uppercase tracking-[^>]*>.*?</span>',
                r'\1',
                content,
                flags=re.DOTALL
            )

            if content != original_content:
                with open(file_path, 'w') as f:
                    f.write(content)
                updated_count += 1
                print(f"Updated {file_path}")

print(f"Total files updated: {updated_count}")
