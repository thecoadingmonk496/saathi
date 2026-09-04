import re

with open('src/pages/Register.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the layout
old_layout = '''        <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 my-auto w-full">
          {/* Toggle */}
          <div className="mb-6 flex items-center bg-white/20 backdrop-blur-md p-1.5 rounded-full border border-white/30 shadow-lg">
            <button type="button" onClick={() => setRegisterMode('FARMER')} className={px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 }>Register as Farmer</button>
            <button type="button" onClick={() => setRegisterMode('BUYER')} className={px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 }>Register as Buyer</button>
          </div>

          <div className={w-full transition-all duration-500 ease-in-out }>
            {registerMode === 'BUYER' ? (
              <BuyerRegister embedded={true} />
            ) : (
              <div className="w-full bg-white rounded-lg shadow-2xl border border-[var(--saathi-border-light)] p-6 sm:p-8 transition-all">

                {/* Already logged in notice if applicable */}'''

new_layout = '''        <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 my-auto w-full">
          {/* Toggle */}
          <div className="mb-6 flex items-center bg-white/20 backdrop-blur-md p-1.5 rounded-full border border-white/30 shadow-lg">
            <button type="button" onClick={() => setRegisterMode('FARMER')} className={px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 }>Register as Farmer</button>
            <button type="button" onClick={() => setRegisterMode('BUYER')} className={px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 }>Register as Buyer</button>
          </div>

          <div className={w-full bg-white rounded-lg shadow-2xl border border-[var(--saathi-border-light)] p-6 sm:p-8 transition-all duration-500 ease-in-out }>
            {/* Already logged in notice if applicable */}'''

text = text.replace(old_layout, new_layout)

# Replace the text of the header
text = text.replace('<h2 className="text-xl sm:text-2xl font-extrabold text-[var(--saathi-text)]">Create Farmer Account</h2>', "<h2 className=\"text-xl sm:text-2xl font-extrabold text-[var(--saathi-text)]\">Create {registerMode === 'FARMER' ? 'Farmer' : 'Buyer'} Account</h2>")
text = text.replace('Register to access market intelligence and buyers', "Register to access market intelligence and {registerMode === 'FARMER' ? 'buyers' : 'farmers'}")

# Now insert the ternary around the form
form_start_str = '<form onSubmit={handleRegister} className="space-y-4">'
form_start = text.find(form_start_str)

form_end_str = '</form>'
form_end = text.find(form_end_str, form_start) + len(form_end_str)

new_form_content = f'''            {{registerMode === 'BUYER' ? (
              <div className="mt-6 border-t border-[var(--saathi-border-light)] pt-6">
                <BuyerRegister embedded={{true}} />
              </div>
            ) : (
              {text[form_start:form_end]}
            )}}'''

text = text[:form_start] + new_form_content + text[form_end:]

# And clean up the ending of the file
old_end = '''            </div>
          </div>
            </div>
          )}
        </div>
      </main>

      <div className="h-6" />
    </div>
  );
}'''

new_end = '''            </div>
          </div>
        </div>
      </main>

      <div className="h-6" />
    </div>
  );
}'''

text = text.replace(old_end, new_end)

with open('src/pages/Register.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
