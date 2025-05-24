const express = require('express');
const app = express();
const userModel = require('./models/user');
const postModel = require('./models/post');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.get('/', (req, res) => {
    res.render('index');
    });

app.get('/login', (req, res) => {
    res.render('login');
    });

app.get('/profile',isLoggedIn, async(req, res) => {
   let user= await userModel.findOne({email: req.user.email}).populate("posts"); //will show what's written / if won't use populate the field will remain empty
   
    res.render('profile', {user});
    });

app.get('/like/:id',isLoggedIn, async(req, res) => {
   let post= await postModel.findOne({_id: req.params.id}).populate("user");
    if(post.likes.indexOf(req.user.userid) === -1){  // user id isn't present in the like array
         post.likes.push(req.user.userid); // like badha dega 
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);   // agar user id like array mai hai to use hata dega 
    }
   await post.save(); //save the post
   res.redirect('/profile');
});

app.get('/edit/:id',isLoggedIn, async(req, res) => {
   let post= await postModel.findOne({_id: req.params.id}).populate("user");  //post dundha h edit krne kae liye
   res.render('edit',{post}); //post ko edit page par bhej diya
   
});
app.post('/update/:id',isLoggedIn, async(req, res) => {
   let post= await postModel.findOneAndUpdate({_id: req.params.id},{content : req.body.content})   
   res.redirect("/profile");
   
});

app.post('/post', isLoggedIn, async(req, res) => {                        //hmseha post tbhi hoga jab apn logged in honge
   let user= await userModel.findOne({email: req.user.email});
   let {content} = req.body;
    let post =  await postModel.create({
        user: user._id,
        content: content
    });
    user.posts.push(post.id);
    await user.save();
    res.redirect("/profile")
    });

app.post('/register', async(req, res) => {
 let {email, password, username, name, age}= req.body; 

 let user = await userModel.findOne({email});
    if(user){
            return res.status(500).send("User already exists");
    };
        
         //creating the user
         bcrypt.genSalt(10, (err, salt) =>{
            bcrypt.hash(password, salt, async (err, hash) => {
                let user = await userModel.create({
                        username,
                        email,
                        age,
                        name,
                        password: hash
                });
                let token = jwt.sign({email: email, userid: user._id}, "shhhh");
                res.cookie("token", token);
                res.send("registered");
          })
        })

});

app.post('/login', async(req, res) => {
 let {email, password}= req.body; 

 let user = await userModel.findOne({email});
    if(!user){
            return res.status(500).send("Something went wrong");
    };
        //checking the password
        bcrypt.compare(password, user.password), function(err, result){
                if(result){
                        let token = jwt.sign({email: email, userid: user._id}, "shhhh");
                        res.cookie("token", token);
                        res.redirect("/profile");
                }
                else{
                        res.redirect('/login');
                }
        }
        
});

app.get('/logout', (req, res) => {
    res.cookie("token", "");
    res.redirect('/login');
    });
    // MiddleWare to check if user is logged in (protecting the route)
function isLoggedIn(req, res, next) {
    if (!req.cookies.token || req.cookies.token === "") {
        return res.send("You must be logged in");
    }

    jwt.verify(req.cookies.token, "shhhh", (err, decoded) => {
        if (err) {
            return res.status(403).send("Invalid token");
        }

        req.user = decoded; // use the decoded value from the callback
        next();
    });
}
app.listen(3000);