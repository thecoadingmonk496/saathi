import re

with open('src/pages/BuyerRegister.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace export default
content = content.replace('export default function BuyerRegister() {', 'export default function BuyerRegister({ embedded = false }) {')

# Find the start of the return block
return_start = content.find('  return (\n    <div className="min-h-screen')

# The part we want to keep starts here:
content_start = content.find('        <div className="bg-white rounded-3xl', return_start)

# Replace everything from return_start to content_start with const content = (
content = content[:return_start] + '  const content = (\n' + content[content_start:]

# Now replace the end of the return block
# We need to find the specific ending
end_target = '''                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}'''

new_end = '''                </button>
              )}
            </div>
          </div>
        </div>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen bg-[var(--saathi-primary)] pb-12">
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-bold text-emerald-100">
            🛡️ SAATHI Verified Buyer Program
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white">Register as Buyer</h1>
          <p className="mt-2 text-sm text-emerald-100/80 max-w-xl mx-auto">
            Join Saathi as a verified buyer and connect with farmers.
          </p>
        </header>
        {content}
      </div>
    </div>
  );
}'''

content = content.replace(end_target, new_end)

with open('src/pages/BuyerRegister.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
