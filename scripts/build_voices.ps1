Add-Type -AssemblyName System.Speech
$ErrorActionPreference='Stop'
$voiceSynth=New-Object System.Speech.Synthesis.SpeechSynthesizer
$voiceSynth.SelectVoice('Microsoft Zira Desktop')
$voiceSynth.Volume=100
$ffmpegExe=(Get-Command ffmpeg).Source
$cast=@('nvda','spy','tsla','crcl','aapl','qqq','mstr','spcx','meta','amzn','goog','msft','principal')
$spoken=@('Nvidia','S and P','Tesla','Circle','Apple','Nasdaq','Micro Strategy','Space X','Meta','Amazon','Google','Microsoft','Everybody')
$lines=@(
 '@NAME@! Boss, I want size!',
 'Pick up the phone! Come on!',
 'Watch the tape! Watch the tape!',
 'Get me a quote! Right now!',
 'Who approved that? Who approved that!',
 'Trimmed? You have got to be kidding!',
 'Risk desk killed it! Unbelievable!',
 'That is a fill! Print the ticket!',
 'I called it! I called that move!',
 'Keep it tight! Eyes on your screens!'
)
New-Item -ItemType Directory -Force '.voice-build','public/vo' | Out-Null
$manifest=@{}
for($deskIndex=0;$deskIndex -lt $cast.Count;$deskIndex++){
 $desk=$cast[$deskIndex]
 New-Item -ItemType Directory -Force "public/vo/$desk" | Out-Null
 $items=@()
 for($lineIndex=0;$lineIndex -lt $lines.Count;$lineIndex++){
  $text=$lines[$lineIndex].Replace('@NAME@',$spoken[$deskIndex])
  $wave=[IO.Path]::GetFullPath(".voice-build/$desk-$lineIndex.wav")
  $voiceSynth.Rate=1+($deskIndex%3)
  $voiceSynth.SetOutputToWaveFile($wave)
  $voiceSynth.Speak($text)
  $voiceSynth.SetOutputToNull()
  $pitch=@(.77,.94,.82,1.04,.89,.80,1.08,.85,.96,.78,1.02,.87,.72)[$deskIndex]
  $rate=[int](22050*$pitch)
  $tempo=(1.06/$pitch).ToString([Globalization.CultureInfo]::InvariantCulture)
  $filter="aresample=22050,asetrate=$rate,aresample=22050,atempo=$tempo,highpass=f=170,lowpass=f=6500,acompressor=threshold=0.1:ratio=4:attack=5:release=70,loudnorm=I=-16:TP=-1.5:LRA=7"
  & $ffmpegExe -hide_banner -loglevel error -y -i $wave -af $filter -codec:a libmp3lame -b:a 64k "public/vo/$desk/$lineIndex.mp3"
  if($LASTEXITCODE -ne 0){throw 'Voice encoding failed'}
  $items+=@{url="/vo/$desk/$lineIndex.mp3";text=$text}
 }
 $manifest[$desk]=$items
 Write-Output "Built voice profile: $desk"
}
$voiceSynth.Dispose()
$manifest | ConvertTo-Json -Depth 5 | Set-Content public/vo/manifest.json -Encoding utf8
Write-Output '130 original synthetic floor calls ready.'

& $ffmpegExe -hide_banner -loglevel error -y -stream_loop -1 -i public/vo/nvda/2.mp3 -stream_loop -1 -i public/vo/tsla/3.mp3 -stream_loop -1 -i public/vo/crcl/1.mp3 -stream_loop -1 -i public/vo/aapl/9.mp3 -filter_complex "[0:a]adelay=0:all=1[a];[1:a]adelay=900:all=1[b];[2:a]adelay=1600:all=1[c];[3:a]adelay=2400:all=1[d];[a][b][c][d]amix=inputs=4:normalize=0,highpass=f=250,lowpass=f=1200,volume=0.3,afade=t=in:d=0.4,afade=t=out:st=19.6:d=0.4" -t 20 -ac 2 -codec:a libmp3lame -b:a 96k public/vo/room-babble.mp3
