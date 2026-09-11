Add-Type -AssemblyName System.Speech
$ErrorActionPreference='Stop'
$voiceSynth=New-Object System.Speech.Synthesis.SpeechSynthesizer
$voiceSynth.SelectVoice('Microsoft Zira Desktop')
$voiceSynth.Volume=100
$ffmpegExe=(Get-Command ffmpeg).Source
$dialogue=Get-Content -Raw scripts/voice-script.json | ConvertFrom-Json
New-Item -ItemType Directory -Force '.voice-build','public/vo/v2' | Out-Null
$previous=@{}
if(Test-Path public/vo/manifest-v2.json){$previous=Get-Content -Raw public/vo/manifest-v2.json | ConvertFrom-Json}
$manifest=@{}
$deskIndex=0
foreach($entry in $dialogue.PSObject.Properties){
 $desk=$entry.Name
 New-Item -ItemType Directory -Force "public/vo/v2/$desk" | Out-Null
 $items=@();$lineIndex=0
 foreach($line in $entry.Value){
  $text=$line.text
  $cached=$null
  if($previous.$desk -and $lineIndex -lt $previous.$desk.Count){$cached=$previous.$desk[$lineIndex]}
  if($cached -and $cached.text -eq $text -and (Test-Path "public/vo/v2/$desk/$lineIndex.mp3")){
   $items+=@{url="/vo/v2/$desk/$lineIndex.mp3";text=$text;category=$line.category;key=$line.key}
   $lineIndex++
   continue
  }
  $wave=[IO.Path]::GetFullPath(".voice-build/v2-$desk-$lineIndex.wav")
  $voiceSynth.Rate=1+($deskIndex%3)
  $voiceSynth.SetOutputToWaveFile($wave);$voiceSynth.Speak($text);$voiceSynth.SetOutputToNull()
  $pitch=@(.77,.94,.82,1.04,.89,.80,1.08,.85,.96,.78,1.02,.87,.72)[$deskIndex]
  $rate=[int](22050*$pitch);$tempo=(1.06/$pitch).ToString([Globalization.CultureInfo]::InvariantCulture)
  $filter="aresample=22050,asetrate=$rate,aresample=22050,atempo=$tempo,highpass=f=170,lowpass=f=6500,acompressor=threshold=0.1:ratio=4:attack=5:release=70,loudnorm=I=-16:TP=-1.5:LRA=7"
  & $ffmpegExe -hide_banner -loglevel error -y -i $wave -af $filter -codec:a libmp3lame -b:a 64k "public/vo/v2/$desk/$lineIndex.mp3"
  if($LASTEXITCODE -ne 0){throw 'Voice encoding failed'}
  $items+=@{url="/vo/v2/$desk/$lineIndex.mp3";text=$text;category=$line.category;key=$line.key}
  $lineIndex++
 }
 $manifest[$desk]=$items;$deskIndex++
 Write-Output "Built $desk : $lineIndex calls"
}
$voiceSynth.Dispose()
$manifest | ConvertTo-Json -Depth 5 | Set-Content public/vo/manifest-v2.json -Encoding utf8
# Long, heavily muffled collage replaces the obvious short spoken loop.
$concat=@()
foreach($desk in @('nvda','spy','tsla','crcl','aapl','qqq','mstr','spcx','meta','amzn','goog','msft')){
 foreach($i in @(3,8,12)){ $audioPath=[IO.Path]::GetFullPath("public/vo/v2/$desk/$i.mp3").Replace('\','/');$concat+="file '$audioPath'" }
}
$concat | Set-Content .voice-build/babble-input.txt -Encoding ascii
& $ffmpegExe -hide_banner -loglevel error -y -f concat -safe 0 -i .voice-build/babble-input.txt -filter_complex "[0:a]asplit=3[a][b][c];[a]lowpass=f=600,volume=0.22[a1];[b]adelay=2700:all=1,lowpass=f=500,volume=0.16[b1];[c]adelay=6100:all=1,lowpass=f=700,volume=0.15[c1];[a1][b1][c1]amix=inputs=3:normalize=0,highpass=f=260" -ac 2 -codec:a libmp3lame -b:a 64k public/vo/room-babble-v2.mp3
Write-Output 'Expanded dialogue bank and long murmur bed ready.'


