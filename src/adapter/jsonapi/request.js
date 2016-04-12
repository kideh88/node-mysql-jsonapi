'use strict';

class JsonApiRequest {

  constructor (request) {
    // IS THIS EVEN NECESSARY?
    //take the node request object and validate both request.url (string) and request.bodyDataStream (string)
    //return {} RETURN A NODE TREE OR PROPER STRUCTURED REQUEST OBJECT
  }

  validateEndpoint () {
    // VALIDATE THE ENDPOINT VS JSONAPI SPECS
  };

  parseEndpoint () {
    // RESTRUCTURE TO MAKE IT EASY TO USE FOR ADAPTER
  };

  validateBody () {
    // VALIDATE THE BODY VS JSONAPI SPECS
  };

  parseBody () {
    // RESTRUCTURE TO MAKE IT EASY TO USE FOR ADAPTER
  };

  tokenizeUrl (url) {

  }

  prepareUrl () {
    // decline double slash but trim leading/trailing slash
  }

}

module.exports = JsonApiRequest;


// @TODO: Tokenization function result examples
var url, tokens;

url     = 'article/5';
url     = 'article/5/author';
url     = 'article/5/relationships/author';
url     = 'article/5?include=comments';
url     = 'article/5?include=comments&sort=-createdOn';
url     = 'article/5?include=comments&sort=-createdOn&fields[article]=title';
url     = 'article/5?include=comments&sort=-createdOn&fields[article]=title,content&fields[comment]=content';
url     = 'article/5?include=comments.author&sort=-createdOn&fields[article]=title,content&fields[comment]=content&page[limit]=20&page[offset]=50&filter=[article.name]eq[how%20to%20build%20a%20compiler]';
tokens  = ['article', '/', '5']; // ? | end
tokens  = ['article', '/', '5', '/', 'author']; // ? | end
tokens  = ['article', '/', '5', '/', 'relationships', 'author']; // ? | end
tokens  = ['article', '/', '5', '?', 'include', '=', 'comments']; // & | end
tokens  = ['article', '/', '5', '?', 'include', '=', 'comments', '&', 'sort', '=', '-', 'createdOn']; // & | end
tokens  = ['article', '/', '5', '?', 'include', '=', 'comments', '&', 'sort', '=', '-', 'createdOn', '&', 'fields', '[', 'article', ']', '=', 'title']; // & | end
tokens  = ['article', '/', '5', '?', 'include', '=', 'comments', '&', 'sort', '=', '-', 'createdOn', '&', 'fields', '[', 'article', ']', '=', 'title', ',', 'content', '&', 'fields', '[', 'comment', ']', '=', 'content']; // & | end
tokens  = ['article', '/', '5', '?', 'include', '=', 'comments', '.', 'author', '&', 'fields', '[', 'article', ']', '=', 'title', ',', 'content', '&', 'sort', '=', '-', 'createdOn', '&', 'fields', '[', 'comment', ']', '=', 'content', '&', 'page', '[', 'limit', ']', '=', '20', '&', 'page', '[', 'offset', '=', '50', '&', 'filter', '=', '[', 'article', '.', 'name', ']', 'eq', '[', 'how%20to%20build%20a%20compiler', ']'];                                            // & | end
