-- Create tickets table (owned by Games API)
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    numbers INTEGER[] NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create draws table (owned by Results API)
CREATE TABLE IF NOT EXISTS draws (
    id SERIAL PRIMARY KEY,
    winning_numbers INTEGER[] NOT NULL,
    drawn_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed one draw so the app has data on first load
INSERT INTO draws (winning_numbers) VALUES ('{7, 23, 35, 41, 12}');
