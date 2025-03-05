import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

// Placeholder components -  These need to be implemented
const BlogsList = () => <h1>Blogs List</h1>;
const KeywordsList = () => <h1>Keywords List</h1>;
const NewPost = () => <h1>New Post</h1>;
const EditPost = ({ match }) => <h1>Edit Post {match.params.id}</h1>;
const ViewPost = ({ match }) => <h1>View Post {match.params.id}</h1>;


function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" component={BlogsList} />
        <Route path="/blogs" component={BlogsList} />
        <Route path="/keywords" component={KeywordsList} />
        <Route path="/new" component={NewPost} />
        <Route path="/edit/:id" component={EditPost} />
        <Route path="/view/:id" component={ViewPost} />
      </Switch>
    </Router>
  );
}

export default App;