param([string]$SceneFilter='*')
Add-Type -AssemblyName System.Speech
$ErrorActionPreference='Stop'
$voice=New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice.SelectVoice('Microsoft Zira Desktop');$voice.Rate=2
New-Item -ItemType Directory -Force '.voice-build','public/vo/show' | Out-Null
$scenes=Get-Content -Raw packages/core/show-scenes.json | ConvertFrom-Json
foreach($scene in $scenes | Where-Object { $_.id -like $SceneFilter }){
 for($i=0;$i -lt $scene.beats.Count;$i++){
  $beat=$scene.beats[$i];$pitch=if($beat.speaker -eq 'principal'){.74}elseif($beat.speaker -eq 'rival'){.87}else{1.03}
  $rate=[int](22050*$pitch);$tempo=(1.08/$pitch).ToString([Globalization.CultureInfo]::InvariantCulture)
  for($v=0;$v -lt $beat.lines.Count;$v++){
   $name="$($scene.id)-$i-$v";$wav=[IO.Path]::GetFullPath(".voice-build/show-$name.wav")
   $voice.SetOutputToWaveFile($wav);$voice.Speak($beat.lines[$v]);$voice.SetOutputToNull()
   & ffmpeg -hide_banner -loglevel error -y -i $wav -af "aresample=22050,asetrate=$rate,aresample=22050,atempo=$tempo,highpass=f=150,lowpass=f=7000,loudnorm=I=-16:TP=-2:LRA=7" -codec:a libmp3lame -b:a 80k "public/vo/show/$name.mp3"
   if($LASTEXITCODE -ne 0){throw 'Show audio build failed'}
  }
 }
 Write-Output "Voiced $($scene.id)"
}
$voice.Dispose()
