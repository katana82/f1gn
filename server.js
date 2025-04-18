const express = require('express');
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');
const marked = require('marked');

const app = express();
const uploadPath = path.join(__dirname, 'uploads');

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
        date: data.date
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // newest first

  res.render('index', { posts });
});

// GET: submission form page
app.get('/submit', (req, res) => {
  res.render('submit');
});


// Handle post submission
app.post('/submit', (req, res) => {
  const { title, text, author, date } = req.body;
  const slug = slugify(title, { lower: true, strict: true });
  const safeDate = date || new Date().toISOString(); // fallback to now if blank

  const data = {
    title,
    text,
    author,
    date: safeDate,
    slug
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
      htmlContent
    });
  } else {
    res.status(404).send('Post not found');
  }
});

app.listen(3000, () => {
  console.log('F1 News site running at http://localhost:3000');
});