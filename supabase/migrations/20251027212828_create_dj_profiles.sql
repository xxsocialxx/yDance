-- Create DJ profiles table
CREATE TABLE dj_profiles (
  id SERIAL PRIMARY KEY,
  pubkey TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  about TEXT,
  picture TEXT,
  soundcloud TEXT,
  instagram TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add some sample data
INSERT INTO dj_profiles (pubkey, name, about, picture, soundcloud, instagram) VALUES
('npub1djshadow123', 'DJ Shadow', 'Underground techno legend from Berlin', 'djshadow.jpg', 'djshadow-official', '@djshadow'),
('npub1djluna456', 'DJ Luna', 'House music master with deep grooves', 'djluna.jpg', 'djluna-music', '@djluna'),
('npub1djnova789', 'DJ Nova', 'Deep house specialist creating atmospheric sounds', 'djnova.jpg', 'djnova-deep', '@djnova');
