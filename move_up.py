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
            
            # Replace pt-24 with pt-8 or pt-6 for the wrapper that contains ProgressBar
            # Actually, pt-24 might be used for other things too?
            # Let's match the block specifically:
            # className="relative z-20 flex-shrink-0 pt-24"
            # Or className="relative z-20 flex-shrink-0 pt-16"
            
            content = re.sub(
                r'className="relative z-20 flex-shrink-0 pt-[0-9]+"',
                r'className="relative z-20 flex-shrink-0 pt-6"',
                content
            )

            # Some files might just have pt-24 on a div right above ProgressBar
            # So let's look at <ProgressBar being right inside or below a div with pt-24
            content = re.sub(
                r'pt-24">\s*<ProgressBar',
                r'pt-6">\n        <ProgressBar',
                content
            )
            content = re.sub(
                r'pt-24">\n\s*<ProgressBar',
                r'pt-6">\n        <ProgressBar',
                content
            )
            
            # Let's also check ProgressBar.tsx itself. We have py-6 there.
            
            if content != original_content:
                with open(file_path, 'w') as f:
                    f.write(content)
                updated_count += 1
                print(f"Updated {file_path}")

print(f"Total files updated: {updated_count}")
