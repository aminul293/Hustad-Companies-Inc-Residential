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
            
            # If the file imports ProgressBar or uses it
            if '<ProgressBar' in content:
                original_content = content
                
                # The absolute block looks like:
                # <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
                #   <div className="flex flex-col items-center gap-1">
                #     <img src="/logo.svg" alt="Hustad Logo" className="h-10 w-auto dark:invert opacity-90 transition-all duration-300" />
                #   </div>
                # </div>
                
                # Regex to match this entire block
                # Since we know the exact classes we just put there:
                pattern = r'<div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none(?: text-\[var\(--tx1\)\])?">\s*<div className="flex flex-col items-center gap-1">\s*<img src="/logo\.svg" alt="Hustad Logo" className="h-10 w-auto dark:invert opacity-90 transition-all duration-300" />\s*</div>\s*</div>'
                
                content = re.sub(pattern, '', content)
                
                if content != original_content:
                    with open(file_path, 'w') as f:
                        f.write(content)
                    updated_count += 1
                    print(f"Updated {file_path}")

print(f"Total files updated: {updated_count}")
