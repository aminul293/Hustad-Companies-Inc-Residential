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
            
            # Center the absolute wrapper
            content = re.sub(
                r'absolute top-8 left-8 z-30 flex flex-col items-start',
                r'absolute top-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center',
                content
            )

            # Center the inner gap-1 wrapper
            content = re.sub(
                r'className="flex flex-col items-start gap-1"',
                r'className="flex flex-col items-center gap-1"',
                content
            )

            if content != original_content:
                with open(file_path, 'w') as f:
                    f.write(content)
                updated_count += 1
                print(f"Updated {file_path}")

print(f"Total files updated: {updated_count}")
