Add-Type -AssemblyName System.Speech
$ErrorActionPreference='Stop'
$voice=New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice.SelectVoice('Microsoft Zira Desktop')
$voice.Rate=3
New-Item -ItemType Directory -Force '.voice-build','public/vo/cutaway' | Out-Null
$lines=@{panic='Ah! No! No, no, no!';arrival='Right. Where were we?'}
foreach($name in $lines.Keys){
 $wav=[IO.Path]::GetFullPath(".voice-build/cutaway-$name.wav")
 $voice.SetOutputToWaveFile($wav);$voice.Speak($lines[$name]);$voice.SetOutputToNull()
 & ffmpeg -hide_banner -loglevel error -y -i $wav -af 'aresample=22050,asetrate=17640,aresample=22050,atempo=1.3,highpass=f=170,lowpass=f=6500,loudnorm=I=-18:TP=-3:LRA=7' -codec:a libmp3lame -b:a 64k "public/vo/cutaway/$name.mp3"
 if($LASTEXITCODE -ne 0){throw 'Audio build failed'}
}
$voice.Dispose()
