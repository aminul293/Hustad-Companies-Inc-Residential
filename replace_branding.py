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
            
            # The pattern needs to match:
            # <div className="absolute top-10 left-10 z-30 flex flex-col items-start pointer-events-none...">
            #   <div className="flex flex-col items-start gap-1">
            #     <img src="/logo.svg" alt="Hustad Logo" className="h-6 w-auto dark:invert opacity-90 transition-all duration-300" />
            #     <span ...>Subtitle</span>
            #   </div>
            # </div>
            
            # We will use re.sub with a regex that captures the wrapper and replaces the contents.
            # But wait! Some might just have the img without the inner div. Let's be careful.
            
            # Let's match:
            # <div className="absolute top-10 left-10 [^>]*>
            # ... up to ... <img src="/logo.svg" ... />
            # ... up to ... </div>
            
            # Actually, the user's issue is specific.
            # "why there is techincal core remove it from and increase size of it and should not overlaps !"
            pass
