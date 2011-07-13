class exports.Connector
  constructor: (@connection) ->

  # Only buddycloud afaik
  domain: =>
    "buddycloud.com"

  # The broadcaster
  pubsubService: =>
    "broadcaster.#{@domain()}"

  # The pubsub bridge jid
  pubsubJid: =>
    "pubsub-bridge@#{@pubsubService()}"

  # Add a user to your roster
  addUserToRoster: (jid) ->
    @connection.roster.subscribe(jid)

  # Remove a user from your roster
  removeUserFromRoster: (jid) ->
    @connection.roster.unsubscribe(jid)

  # Parse a roster
  # _parseRoster: (response) ->
  #   addItem = (item) =>
  #     user = @roster.findOrCreateByJid item.attr('jid')
  #     user.set { subscription : item.attr('subscription'), group : item.find('group:first').text()  }
  #     user.save()
  #
  #   for item in response.find('item')
  #     addItem($(item))

  #
  # Subscription request
  #
  subscribeToChannel: (channel, user, succ, err) =>
    @connection.buddycloud.subscribeChannel(channel.getNode(),
      ((response) => succ? true), ((e) => err? e))

  # Get the subscriptions for a user, calls succ with an array of hashes of channels
  getUserSubscriptions: (_, succ, err) => # ???
    @connection.buddycloud.getUserSubscriptions succ, err

  # Get metadata, calls succ with a hash of metadata
  getMetadata: (channel, succ, err) =>
    @connection.buddycloud.getMetadata channel.get('node'), succ, err

  # Get channel posts, calls succ with a array of hashes of posts
  getChannelPosts: (channel, succ, err) =>
    @connection.buddycloud.getChannelPosts channel.getNode(), succ, err

  # Sends a presence stanza to the server, subscribing to new IQs
  announcePresence: (user) ->
    maxMessageId = "1292405757510"

    # Todo - find out which one of these works and delete the rest

    @connection.send($pres().c('status').t('buddycloud channels'))
    @connection.send($pres( { "type" : "subscribe", "to" : @pubsubJid() } ).tree())

#   onIq : (stanza) ->
#     posts = for item in $(stanza).find('item')
#       @_parsePost($(item))
#
#     for obj in posts
#       if Posts.get(obj.id)
#         # do nothing
#       else
#         p = new Post(obj)
#         Posts.add(p)
#         p.save()

#   # Takes an <item /> stanza and returns a hash of it's attributes
#   _parsePost : (item) ->
#     post = {
#       id : parseInt(item.find('id').text().replace(/.+:/,''))
#       content : item.find('content').text()
#       author : item.find('author jid').text()
#       published : item.find('published').text()
#     }
#
#     if item.find 'in-reply-to'
#       post.in_reply_to = parseInt(item.find('in-reply-to').attr('ref'))
#
#     if item.find 'geoloc'
#       post.geoloc_country = item.find('geoloc country').text()
#       post.geoloc_locality = item.find('geoloc locality').text()
#       post.geoloc_text = item.find('geoloc text').text()
#
#     post