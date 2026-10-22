with open('/app/applet/src/components/AdminBackoffice.tsx', 'r') as f:
    content = f.read()

target_state = """  const [promptPaySetting, setPromptPaySetting] = useState('0982349812');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/admin/merchant-settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.merchantPromptPayNumber) {
          setPromptPaySetting(data.merchantPromptPayNumber);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsSuccess(false);
    try {
      const res = await fetch('/api/admin/merchant-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptPayNumber: promptPaySetting })
      });"""

replacement_state = """  const [promptPaySetting, setPromptPaySetting] = useState('0982349812');
  const [xenditSecretKey, setXenditSecretKey] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/admin/merchant-settings')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.merchantPromptPayNumber) setPromptPaySetting(data.merchantPromptPayNumber);
          if (data.xenditSecretKey) setXenditSecretKey(data.xenditSecretKey);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsSuccess(false);
    try {
      const res = await fetch('/api/admin/merchant-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptPayNumber: promptPaySetting, xenditSecretKey })
      });"""

if target_state in content:
    content = content.replace(target_state, replacement_state)
    print("State replaced successfully")
else:
    print("Target state not found")

target_form = """              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  หมายเลขพร้อมเพย์ (เบอร์โทร 10 หลัก หรือ เลขเสียภาษี 13 หลัก)
                </label>
                <input
                  type="text"
                  value={promptPaySetting}
                  onChange={(e) => setPromptPaySetting(e.target.value)}
                  placeholder="เช่น 0812345678 หรือ 010555xxxxxxx"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  * หมายเหตุ: เบอร์นี้ต้องเป็นเบอร์ที่ผูกพร้อมเพย์กับบัญชีธนาคารจริงของคุณ เพื่อให้ลูกค้าสแกนโอนเข้าบัญชีของคุณได้ทันที
                </p>
              </div>"""

replacement_form = """              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  หมายเลขพร้อมเพย์ (เบอร์โทร 10 หลัก หรือ เลขเสียภาษี 13 หลัก)
                </label>
                <input
                  type="text"
                  value={promptPaySetting}
                  onChange={(e) => setPromptPaySetting(e.target.value)}
                  placeholder="เช่น 0812345678 หรือ 010555xxxxxxx"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  * หมายเหตุ: เบอร์นี้ต้องเป็นเบอร์ที่ผูกพร้อมเพย์กับบัญชีธนาคารจริงของคุณ เพื่อให้ลูกค้าสแกนโอนเข้าบัญชีของคุณได้ทันที
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Xendit Secret Key (Live / Development)
                </label>
                <input
                  type="password"
                  value={xenditSecretKey}
                  onChange={(e) => setXenditSecretKey(e.target.value)}
                  placeholder="xnd_production_... หรือ xnd_development_..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  * ใส่ Secret Key จาก Xendit Dashboard เพื่อเชื่อมต่อ API สร้าง QR Code และรับยอดเงินเข้าบัญชีธนาคาร (เช่น KBank 3379) อัตโนมัติ
                </p>
              </div>"""

if target_form in content:
    content = content.replace(target_form, replacement_form)
    print("Form replaced successfully")
else:
    print("Target form not found")

with open('/app/applet/src/components/AdminBackoffice.tsx', 'w') as f:
    f.write(content)
print("Saved AdminBackoffice.tsx")
