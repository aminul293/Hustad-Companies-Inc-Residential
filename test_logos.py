import os
import re

dir_path = 'src/components/screens'
for root, dirs, files in os.walk(dir_path):
    for file in files:
        if file.endswith('.tsx'):
            file_path = os.path.join(root, file)
            with open(file_path, 'r') as f:
                content = f.read()
            
            has_logo = 'logo.svg' in content
            has_prog = '<ProgressBar' in content
            print(f"{file}: Logo={has_logo}, Prog={has_prog}")
