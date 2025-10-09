import { useState, useEffect } from 'react';

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Sonic müzik playlist'i - YouTube linkini audio olarak kullanamayız, 
    // bu yüzden alternatif bir Sonic temalı müzik dosyası kullanacağız
    const audioElement = new Audio('/sonic-music.mp3'); // Proje klasörüne eklenecek
    audioElement.loop = true;
    audioElement.volume = 0.5;
    setAudio(audioElement);

    // Sayfa yüklendiğinde otomatik başlat
    const timer = setTimeout(() => {
      audioElement.play().catch(() => {
        // Otomatik oynatma başarısız olursa kullanıcı etkileşimi bekle
        console.log('Autoplay prevented, waiting for user interaction');
      });
      setIsPlaying(true);
    }, 1000);

    return () => {
      clearTimeout(timer);
      audioElement.pause();
    };
  }, []);

  const toggleMusic = () => {
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="music-controls">
      <button
        onClick={toggleMusic}
        className="game-button flex items-center space-x-2 p-3"
        title={isPlaying ? 'Müziği Durdur' : 'Müziği Başlat'}
      >
        <div className="w-8 h-8 rounded-full bg-sonic-blue flex items-center justify-center">
          🦔
        </div>
        <span className="text-sm">
          {isPlaying ? '⏸️' : '▶️'}
        </span>
      </button>
    </div>
  );
};

export default MusicPlayer;
