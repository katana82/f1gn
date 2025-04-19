const express = require('express');
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');
const marked = require('marked');

const app = express();
const uploadPath = path.join(__dirname, 'uploads');

const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, 'data', 'data.db'));


app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

//Start-Service ssh-agent

// Homepage: list all posts with title, author, date
app.get('/', (req, res) => {
  const files = fs.readdirSync(uploadPath);
  const posts = files
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const content = fs.readFileSync(path.join(uploadPath, file), 'utf8');
      const data = JSON.parse(content);
      return {
        title: data.title,
        slug: data.slug,
        author: data.author,
        date: data.date,
        image: data.image
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // newest first

  res.render('index', { posts });
});

app.get('/race-results', (req, res) => {
  const results = db.prepare(`
    SELECT r.FinishingPos, r.DriverID, s.FirstName, s.LastName, r.TeamID, r.Points
    FROM Races_Results r
    LEFT JOIN Staff_BasicData s ON r.DriverID = s.StaffID
    WHERE r.RaceID = 132
    ORDER BY r.FinishingPos ASC
  `).all();

  const processed = results.map(row => ({
    position: row.FinishingPos,
    driver: `${row.FirstName?.split('_').pop()} ${row.LastName?.split('_').pop()}`,
    team: row.TeamID,
    points: row.Points
  }));

  res.render('race', { results: processed });
});


// GET: submission form page
app.get('/submit', (req, res) => {
  res.render('submit');
});


// Handle post submission
app.post('/submit', (req, res) => {
  const { title, text, author, date, image } = req.body;
  const slug = slugify(title, { lower: true, strict: true });
  const safeDate = date || new Date().toISOString(); // fallback to now if blank

  const data = {
    title,
    text,
    author,
    date: safeDate,
    slug,
    image
  };

  const filePath = path.join(uploadPath, `${slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  res.redirect(`/post/${slug}`);
});

// Individual post page
app.get('/post/:slug', (req, res) => {
  const filePath = path.join(uploadPath, `${req.params.slug}.json`);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const htmlContent = marked.parse(data.text);
    res.render('post', {
      title: data.title,
      author: data.author,
      date: data.date,
      image: data.image,
      htmlContent
    });
  } else {
    res.status(404).send('Post not found');
  }
});

app.listen(3000, () => {
  console.log('F1 News site running at http://localhost:3000');
});