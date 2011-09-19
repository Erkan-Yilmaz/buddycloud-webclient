{ BaseView } = require('views/base')

# this is the specific view for the geoloc node

class exports.GeoDetail extends BaseView
    template: require 'templates/channel/details/geo'

    initialize: ->
        super
        @model.bind 'change', @render
        @model.bind 'change:node:metadata', @render

    render: =>
        @update_attributes()
        super

    update_attributes: ->
        if (channel = @model.nodes.get 'posts')
            @channel = channel.toJSON yes
        if (geo = @model.nodes.get 'geoloc')
            @geo = geo.toJSON yes
