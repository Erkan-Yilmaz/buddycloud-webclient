{ Posts } = require 'collections/post'
{ Post } = require 'models/post'

##
# Is "opener" along with additional "comments"
class exports.TopicPost extends Post

    initialize: ->
        @comments = new Posts parent:this
        # Bubble changes up:
        @comments.bind 'all', =>
            @trigger 'change'
        super

    # Also dives into comments
    get_last_update: =>
        last = super
        @comments.each (comment) ->
            console.warn "comment", comment, comment.get_last_update()
            last1 = comment.get_last_update()
            if last < last1
                last = last1
        last
