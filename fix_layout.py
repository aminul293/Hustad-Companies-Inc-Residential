import os
import re

dir_path = 'src/components/screens'
for root, dirs, files in os.walk(dir_path):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
            
            old_content = content
            
            # Move progress bar down if it's too high (pt-4, pt-6, pt-8, pt-12)
            content = re.sub(
                r'(className="[^"]*\bpt-(?:4|6|8|12)\b[^"]*")(\s*>\s*<ProgressBar)',
                lambda m: re.sub(r'\bpt-(?:4|6|8|12)\b', 'pt-24', m.group(1)) + m.group(2),
                content
            )

            # Change flex items-baseline to flex-col items-start for logo wrappers
            content = re.sub(
                r'<div className="flex items-baseline gap-[0-9.]+">(\s*<img src="/logo\.svg")',
                r'<div className="flex flex-col items-start gap-1">\1',
                content
            )

            if content != old_content:
                with open(path, 'w') as f:
                    f.write(content)
                print(f"Fixed {path}")

