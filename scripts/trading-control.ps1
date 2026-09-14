param(
 [ValidateSet('menu','status','start','stop','test')][string]$Action='menu',
 [switch]$Confirmed
)
$ErrorActionPreference='Stop'
$controlFolder=Join-Path $env:USERPROFILE '.the-floor\wallet-backup'
$controlTokenFile=Join-Path $controlFolder 'trading-control-token.txt'
$addressFile=Join-Path $controlFolder 'public-address.txt'
$baseUrl='https://tradingfloor-production.up.railway.app'
function Send-FloorControl([string]$choice){
 $publicAddress=(Get-Content -LiteralPath $addressFile -Raw).Trim()
 $controlToken=(Get-Content -LiteralPath $controlTokenFile -Raw).Trim()
 $body=@{action=$choice;wallet=$publicAddress}
 if($choice -eq 'start'){
  if(-not $Confirmed){Write-Host "This enables automatic real-money trading for $publicAddress.";if((Read-Host 'Type START to enable trading') -cne 'START'){Write-Host 'Cancelled.';return}}
  $body.confirmation='START_TRADING'
 }
 if($choice -eq 'test'){
  if(-not $Confirmed){Write-Host 'This runs a 0.01 SOL stock buy and sells only the acquired tokens. Automatic trading stays off. Total test cap: 0.2 SOL including costs.';if((Read-Host 'Type TEST to run the test') -cne 'TEST'){Write-Host 'Cancelled.';return}}
  $body.confirmation='TEST_ONLY'
 }
 try{$result=Invoke-RestMethod -Uri "$baseUrl/api/operator" -Method Post -Headers @{Authorization="Bearer $controlToken"} -ContentType 'application/json' -Body ($body | ConvertTo-Json -Compress) -TimeoutSec 20}
 catch{Write-Host 'Command could not be confirmed. Use Status before retrying. Trading is not assumed to have changed.' -ForegroundColor Yellow;return}
 finally{$controlToken=$null}
 Write-Host "Wallet: $($result.wallet)"
 Write-Host "Automatic trading: $(if($result.running){'ON'}else{'OFF'})" -ForegroundColor $(if($result.running){'Green'}else{'Yellow'})
 Write-Host "SOL: $($result.sol) | Risk halt: $($result.killed)"
 if($result.pending){Write-Host "Pending: https://solscan.io/tx/$($result.pending)"}
 if($result.test){Write-Host "Test: $($result.test.phase) | Reserved against cap: $($result.testReservedSol) / $($result.testBudgetSol) SOL";if($result.test.error){Write-Host "Test note: $($result.test.error)"};if($result.test.buySignature){Write-Host "Buy: https://solscan.io/tx/$($result.test.buySignature)"};if($result.test.sellSignature){Write-Host "Sell: https://solscan.io/tx/$($result.test.sellSignature)"}}
}
if($Action -ne 'menu'){Send-FloorControl $Action;exit}
while($true){
 Write-Host "`nTHE FLOOR - OWNER CONTROLS`n1. Status`n2. Start automatic trading`n3. Stop trading`n4. Test buy and sell only`nQ. Quit"
 switch((Read-Host 'Choose').ToLower()){
  '1'{Send-FloorControl 'status'}
  '2'{Send-FloorControl 'start'}
  '3'{Send-FloorControl 'stop'}
  '4'{Send-FloorControl 'test'}
  'q'{exit}
  default{Write-Host 'Choose 1, 2, 3, 4 or Q.'}
 }
}
