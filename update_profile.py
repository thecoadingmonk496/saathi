import re

with open('src/pages/Profile.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update State
state_target = '''  const [profile, setProfile] = useState({
    name: user.name || user.firstName + ' ' + user.lastName || '',
    mobile: user.mobile || user.phone || '',
    farmerId: user.farmerId || '',
    buyerId: user.buyerId || '',
    village: user.village || address?.locality || '',
    block: user.block || address?.locality || '',
    district: user.district || address?.district || '',
    state: user.state || address?.state || '',
  });'''

state_replacement = '''  const [profile, setProfile] = useState({
    name: user.name || user.firstName + ' ' + user.lastName || '',
    mobile: user.mobile || user.phone || '',
    farmerId: user.farmerId || '',
    buyerId: user.buyerId || '',
    village: user.village || address?.locality || '',
    block: user.block || address?.locality || '',
    district: user.district || address?.district || '',
    state: user.state || address?.state || '',
    isPublicProfile: user.isPublicProfile !== undefined ? user.isPublicProfile : true,
  });
  const [documents, setDocuments] = useState(user.documents || {
    aadhaar: '',
    gstCertificate: '',
    otherDocument: ''
  });'''

text = text.replace(state_target, state_replacement)

# 2. Add progress bar function and document handler
func_target = '''  const updateProfileField = (event) => {'''

func_replacement = '''  const calculateProgress = () => {
    let fields = 0;
    let filled = 0;
    
    const baseFields = ['name', 'mobile', 'village', 'district', 'state'];
    fields += baseFields.length;
    baseFields.forEach(f => { if (profile[f]) filled++; });
    
    if (user.role === 'BUYER') {
      const bFields = ['businessName', 'businessType', 'gstNumber', 'targetCrops'];
      fields += bFields.length;
      bFields.forEach(f => { if (businessDetails[f]) filled++; });
    } else {
      const fFields = ['landHolding', 'primaryCrops', 'irrigation', 'farmingType', 'annualYield', 'harvestSeason', 'soilType', 'certifications'];
      fields += fFields.length;
      fFields.forEach(f => { if (farmDetails[f]) filled++; });
    }
    
    return Math.round((filled / fields) * 100);
  };

  const handleDocumentUpload = (key, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage('Document must be smaller than 5 MB.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setDocuments(prev => ({ ...prev, [key]: reader.result }));
      setSaveMessage(${key} uploaded successfully. Don't forget to save changes.);
    };
    reader.readAsDataURL(file);
  };

  const updateProfileField = (event) => {'''

text = text.replace(func_target, func_replacement)

# 3. Update handleSave to include new fields
save_target = '''    const savedProfile = {
      ...profile,
      name,
      mobile,
      village: profile.village.trim(),
      block: profile.block.trim(),
      district: profile.district.trim(),
      state: profile.state.trim(),
      profileImage,
    };'''

save_replacement = '''    const savedProfile = {
      ...profile,
      name,
      mobile,
      village: profile.village.trim(),
      block: profile.block.trim(),
      district: profile.district.trim(),
      state: profile.state.trim(),
      profileImage,
      documents,
    };'''

text = text.replace(save_target, save_replacement)

# 4. Insert Progress Bar into header
header_target = '''      <header className="bg-white rounded-lg shadow-2xl border border-[var(--saathi-border-light)] p-6 sm:p-8 transition-all flex flex-col sm:flex-row items-center sm:items-start gap-6 relative overflow-hidden">'''

header_replacement = '''      <header className="bg-white rounded-lg shadow-2xl border border-[var(--saathi-border-light)] p-6 sm:p-8 transition-all relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100">
          <div 
            className={h-full transition-all duration-1000 ease-out } 
            style={{ width: ${calculateProgress()}% }} 
          />
        </div>
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mt-2">'''

text = text.replace(header_target, header_replacement)

# Need to close that extra div inside header
header_close_target = '''          </p>
        </div>
      </header>'''
header_close_replacement = '''          </p>
        </div>
        </div>
      </header>'''
text = text.replace(header_close_target, header_close_replacement)


# 5. Insert Public Profile Toggle & Documents section
section_target = '''      <div className="mt-10 grid gap-6 sm:grid-cols-2">'''

section_replacement = '''      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {/* Document Vault */}
        <section className="sm:col-span-2">
          <div className="flex items-center justify-between mb-5 pb-2 border-b-2 border-slate-100/60">
            <h2 className="text-2xl font-extrabold text-[var(--saathi-text)]">Document Vault</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-[var(--saathi-text-secondary)]">Public Profile</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={profile.isPublicProfile} onChange={(e) => setProfile(p => ({ ...p, isPublicProfile: e.target.checked }))} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--saathi-accent)]"></div>
              </label>
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-3">
            {['aadhaar', 'gstCertificate', 'otherDocument'].map(docKey => (
              <div key={docKey} className="bg-white rounded-2xl p-5 border border-[var(--saathi-border-light)] shadow-sm flex flex-col items-center text-center transition hover:border-[var(--saathi-border)]">
                <span className="text-3xl mb-3">📄</span>
                <span className="text-xs font-extrabold text-secondary uppercase tracking-wider">{docKey.replace(/([A-Z])/g, ' ').trim()}</span>
                
                {documents[docKey] ? (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">✓ Uploaded</span>
                    <label className="text-xs font-bold text-red-600 hover:underline cursor-pointer">
                      Replace
                      <input type="file" accept=".pdf,image/*" className="sr-only" onChange={(e) => handleDocumentUpload(docKey, e)} />
                    </label>
                  </div>
                ) : (
                  <label className="mt-4 cursor-pointer w-full bg-[var(--saathi-surface-alt)] hover:bg-slate-100 border border-[var(--saathi-border-light)] px-4 py-2 rounded-xl text-xs font-bold text-[var(--saathi-text-secondary)] transition">
                    Upload Document
                    <input type="file" accept=".pdf,image/*" className="sr-only" onChange={(e) => handleDocumentUpload(docKey, e)} />
                  </label>
                )}
              </div>
            ))}
          </div>
        </section>
'''

text = text.replace(section_target, section_replacement)

with open('src/pages/Profile.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
