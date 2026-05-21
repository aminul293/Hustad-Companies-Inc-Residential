import os
import re

components_dir = "src/components"

for root, _, files in os.walk(components_dir):
    for file in files:
        if file.endswith((".ts", ".tsx")):
            path = os.path.join(root, file)
            with open(path, "r") as f:
                content = f.read()

            if "console." not in content:
                continue
                
            original_content = content
            
            # For ManagerDashboard.tsx line 137
            # console.error("[ManagerDashboard] /api/reps failed:", repsRes.status, await repsRes.text());
            # User instruction: replace the whole catch with `{ /* handled by empty state */ }`
            # Wait, line 137 is not a catch block! It's:
            # if (!repsRes.ok) { console.error(...); return; }
            # User said "replace the whole catch with `{ /* handled by empty state */ }`", but if it's an if-block, I will just remove the console.error.
            
            # Simple line-by-line removal for most cases
            lines = content.split('\n')
            new_lines = []
            for line in lines:
                if 'console.' in line:
                    stripped = line.strip()
                    
                    if "console.log(`Synced ${count}" in line:
                        continue # remove
                    
                    if "console.log(\"[ManagerDashboard] /api/reps response:\"" in line:
                        continue
                        
                    if "console.error(\"[ManagerDashboard] /api/reps failed:\"" in line:
                        continue # remove it. The user said "replace the whole catch...", but we'll just drop the log.
                        
                    # Let's just remove any line that is ONLY a console log (or has it at the end)
                    # For safety, if the line has `if (count > 0) console.log(...)`, we remove the line.
                    if stripped.startswith("console.") or ("} catch" in line and "console.error" in line) or ("console." in line and not any(x in line for x in ["return", "throw"])):
                        # If it's something like `} catch (e) { console.error(e); }`
                        # We can replace the console with `/* non-fatal */`
                        new_line = re.sub(r'console\.(log|error|warn)\([^;]*\);?', '/* non-fatal */', line)
                        
                        # Clean up `if (...) /* non-fatal */` if we made it useless
                        if "if (count > 0) /* non-fatal */" in new_line:
                            continue
                            
                        new_lines.append(new_line)
                    else:
                        # Some cases might have `console.error` mixed with other code
                        new_line = re.sub(r'console\.(log|error|warn)\([^;]*\);?', '/* non-fatal */', line)
                        new_lines.append(new_line)
                else:
                    new_lines.append(line)
                    
            content = '\n'.join(new_lines)
            
            if content != original_content:
                with open(path, "w") as f:
                    f.write(content)

print("done")
