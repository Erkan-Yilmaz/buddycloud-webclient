unless process.title is 'browser'
    return module.exports =
        src: "create_topic_channel.html"
        select: () ->
            @select "div.channelView", ".location.dual, .publish"


{ Template } = require 'dynamictemplate'
jqueryify = require 'dt-jquery'
design = require '../../_design/create_topic_channel/index'

module.exports = design (view) ->
    return jqueryify new Template schema:5, ->
        @$div class:'channelView', ->
            @$form class: "stream clearfix", ->
                @$div class: 'role', ->
                    @$div ->
                        role = null
                        role = @$select id: 'channel_default_role'
                        @$span class: 'hint followerPlusSelected', ->
                            view.bind 'change:role', =>
                                if role.attr('value') is 'publisher'
                                    newClass = 'followerPlusSelected'
                                else
                                    newClass = 'followerSelected'
                                @attr 'class', @attr('class').
                                    replace(/followerSelected|followerPlusSelected/, "") +
                                    " #{newClass}"

            @$nav class: "bottom clearfix", ->
                @$div class: "button callToAction", ->
                    view.bind 'loading:start', @hide
                    # Let user retry:
                    view.bind 'loading:error', @show
                @$div class: 'button', ->
                    # Discard button, where to return on click?
                    @remove()
                @$p class: 'error', style: "margin-right: 84px" , ->
                    # Hidden by default
                    @hide()
                    # Hide previous error
                    view.bind 'loading:start', @hide
                    # Hook error
                    view.bind 'loading:error', (e) =>
                        @text "#{e}"
                        @show()
                @$div class: 'spinner', ->
                    @hide()
                    view.bind 'loading:start', @show
                    view.bind 'loading:error', @hide

            view.bind 'hide', @remove
