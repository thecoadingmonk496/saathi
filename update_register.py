import re

with open('src/pages/Register.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the conditional render part
target_pattern = r'          <div className=\{\w-full transition-all duration-500 ease-in-out \$\{registerMode === \'FARMER\' \? \'max-w-\[460px\]\' : \'max-w-4xl\'\}\\}>\n            \{registerMode === \'BUYER\' \? \(\n              <BuyerRegister embedded=\{true\} />\n            \) : \(\n              <div className=\"w-full bg-white rounded-lg shadow-2xl border border-\[var\(--saathi-border-light\)\] p-6 sm:p-8 transition-all\">\n\n                \{\/\* Already logged in notice if applicable \*\/\}'

replacement = r'''          <div className={w-full bg-white rounded-lg shadow-2xl border border-[var(--saathi-border-light)] p-6 sm:p-8 transition-all duration-500 ease-in-out }>
                {/* Already logged in notice if applicable */}'''

text = text.replace(target_pattern, replacement)

# Replace "Create Farmer Account" dynamically
text = text.replace('<h2 className="text-xl sm:text-2xl font-extrabold text-[var(--saathi-text)]">Create Farmer Account</h2>', '<h2 className="text-xl sm:text-2xl font-extrabold text-[var(--saathi-text)]">Create {registerMode === \'FARMER\' ? \'Farmer\' : \'Buyer\'} Account</h2>')
text = text.replace('Register to access market intelligence and buyers', 'Register to access market intelligence and {registerMode === \'FARMER\' ? \'buyers\' : \'farmers\'}')

# Now we need to put the form in the ternary
# We will find <form onSubmit={handleRegister} className="space-y-4">
form_start = text.find('<form onSubmit={handleRegister} className="space-y-4">')
# And find the end of the form
form_end = text.find('</form>') + len('</form>')

# Wrap the form in the ternary
new_form = f'''            {{registerMode === 'BUYER' ? (
              <BuyerRegister embedded={{true}} />
            ) : (
{text[form_start:form_end]}
            )}}'''

text = text[:form_start] + new_form + text[form_end:]

# At the end of the file, we have:
#             </div>
#           )}
#         </div>
#       </main>
# We need to remove the dangling </div>\n          )}

dangling_target = '''          </div>
            </div>
          )}
        </div>
      </main>'''

dangling_replacement = '''          </div>
        </div>
      </main>'''

text = text.replace(dangling_target, dangling_replacement)

with open('src/pages/Register.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
