from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled
import sys

video_ids = sys.argv[1:]

for video_id in video_ids:
  try:
    srt = YouTubeTranscriptApi.get_transcript(video_id)

    if srt:
      text=''
      for entry in srt:
        text+=entry.get('text')
      print(text)

  except TranscriptsDisabled:
    pass