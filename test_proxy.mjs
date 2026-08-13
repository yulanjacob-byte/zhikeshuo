// Test fetching Sina board data via PowerShell execSync
import { execSync } from 'child_process'

const url = 'https://money.finance.sina.com.cn/q/view/newFLJK.php?param=class'

console.log('Test: Sina board via PowerShell')
try {
  const cmd = `$r = Invoke-WebRequest -Uri '${url}' -TimeoutSec 10 -UseBasicParsing; [System.Text.Encoding]::GetEncoding('gbk').GetString($r.RawContentStream.ToArray())`
  const out = execSync(`powershell -Command "${cmd}"`, { encoding: 'buffer', maxBuffer: 2 * 1024 * 1024 })
  const text = out.toString('utf-8')
  console.log('Length:', text.length)
  console.log('First 300 chars:', text.substring(0, 300))
} catch(e) {
  console.log('Error:', e.message.substring(0, 300))
}
