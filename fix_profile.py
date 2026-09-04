import re
with open('src/pages/Profile.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('{profile.village ? ,  : \\'\\'}{profile.district ? ,  : \\'\\'}{profile.state}', '{profile.village ? ${profile.village},  : \\'\\'}{profile.district ? ${profile.district},  : \\'\\'}{profile.state}')

with open('src/pages/Profile.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
