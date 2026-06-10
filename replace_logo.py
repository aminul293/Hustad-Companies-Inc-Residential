import os
import re

dir_path = 'src/components'
updated_count = 0

for root, dirs, files in os.walk(dir_path):
    for file in files:
        if file.endswith('.tsx'):
            file_path = os.path.join(root, file)
            with open(file_path, 'r') as f:
                content = f.read()
            
            new_content = re.sub(
                r'<span[^>]*>HUSTAD</span>',
                r'<img src="/logo.svg" alt="Hustad Logo" className="h-6 w-auto dark:invert opacity-90 transition-all duration-300" />',
                content
            )
            
            if new_content != content:
                with open(file_path, 'w') as f:
                    f.write(new_content)
                updated_count += 1
                print(f"Updated {file_path}")

print(f"Total files updated: {updated_count}")
