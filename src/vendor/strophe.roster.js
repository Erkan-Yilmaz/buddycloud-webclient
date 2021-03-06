/*
  Copyright 2010, François de Metz <francois@2metz.fr>
*/
/**
 * Roster Plugin
 * Allow easily roster management
 *
 *  Features
 *  * Get roster from server
 *  * handle presence
 *  * handle roster iq
 *  * subscribe/unsubscribe
 *  * authorize/unauthorize
 *  * roster versioning (xep 237)
 */
Strophe.addConnectionPlugin('roster',
{
    _connection: null,

    _callbacks : [],
    /** Property: items
     * Roster items
     * [
     *    {
     *        name         : "",
     *        jid          : "",
     *        subscription : "",
     *        groups       : ["", ""],
     *        resources    : {
     *            myresource : {
     *                show   : "",
     *                status : "",
     *                priority : ""
     *            }
     *        }
     *    }
     * ]
     */
    items : [],
    /** Property: ver
     * current roster revision
     * always null if server doesn't support xep 237
     */
    ver : null,
    /** Function: init
     * Plugin init
     *
     * Parameters:
     *   (Strophe.Connection) conn - Strophe connection
     */
    init: function(conn)
    {
    this._connection = conn;
        this.items = [];
        // Presence subscription
        conn.addHandler(this._onReceivePresence.bind(this), null, 'presence', null, null, null);
        conn.addHandler(this._onReceiveIQ.bind(this), Strophe.NS.ROSTER, 'iq', "set", null, null);

        Strophe.addNamespace('ROSTER_VER', 'urn:xmpp:features:rosterver');
    },
    /** Function: supportVersioning
     * return true if roster versioning is enabled on server
     */
    supportVersioning: function()
    {
        return (this._connection.features && this._connection.features.getElementsByTagName('ver').length > 0);
    },
    /** Function: get
     * Get Roster on server
     *
     * Parameters:
     *   (Function) userCallback - callback on roster result
     *   (String) ver - current rev of roster
     *      (only used if roster versioning is enabled)
     *   (Array) items - initial items of ver
     *      (only used if roster versioning is enabled)
     *     In browser context you can use sessionStorage
     *     to store your roster in json (JSON.stringify())
     */
    get: function(userCallback, ver, items)
    {
        var attrs = {xmlns: Strophe.NS.ROSTER};
        this.items = [];
        if (this.supportVersioning())
        {
            // empty rev because i want an rev attribute in the result
            attrs.ver = ver || '';
            this.items = items || [];
        }
        var iq = $iq({type: 'get',  'id' : this._connection.getUniqueId('roster')}).c('query', attrs);
	var that = this;
        this._connection.sendIQ(iq, function success(stanza) {
	    that._onReceiveRosterSuccess(userCallback, stanza);
	}, function error(stanza) {
	    that._onReceiveRosterError(userCallback, stanza);
	});
    },
    /** Function: registerCallback
     * register callback on roster (presence and iq)
     *
     * Parameters:
     *   (Function) call_back
     */
    registerCallback: function(call_back)
    {
        this._callbacks.push(call_back);
    },
    /** Function: findItem
     * Find item by JID
     *
     * Parameters:
     *     (String) jid
     */
    findItem : function(jid)
    {
        for (var i = 0; i < this.items.length; i++)
        {
            if (this.items[i].jid == jid)
            {
                return this.items[i];
            }
        }
        return false;
    },
    /** Function: subscribe
     * Subscribe presence
     *
     * Parameters:
     *     (String) jid
     */
    subscribe: function(jid)
    {
        this._connection.send($pres({to: jid, type: "subscribe"}));
    },
    /** Function: unsubscribe
     * Unsubscribe presence
     *
     * Parameters:
     *     (String) jid
     */
    unsubscribe: function(jid)
    {
        this._connection.send($pres({to: jid, type: "unsubscribe"}));
    },
    /** Function: authorize
     * Authorize presence subscription
     *
     * Parameters:
     *     (String) jid
     */
    authorize: function(jid)
    {
        this._connection.send($pres({to: jid, type: "subscribed"}));
    },
    /** Function: unauthorize
     * Unauthorize presence subscription
     *
     * Parameters:
     *     (String) jid
     */
    unauthorize: function(jid)
    {
        this._connection.send($pres({to: jid, type: "unsubscribed"}));
    },
    /** Function: update
     * Update roster item
     *
     * Parameters:
     *   (String) jid - item jid
     *   (String) name - name
     *   (Array) groups
     *   (Function) call_back
     */
    update: function(jid, name, groups, call_back)
    {
        var item = this.findItem(jid);
        if (!item)
        {
            throw "item not found";
        }
        var newName = name || item.name;
        var newGroups = groups || item.groups;
        var iq = $iq({type: 'set'}).c('query', {xmlns: Strophe.NS.ROSTER}).c('item', {jid: item.jid,
                                                                                      name: newName,
                                                                                      subscription: item.subscription});
        for (var i = 0; i < newGroups.length; i++)
        {
            iq.c('group').t(newGroups[i]).up();
        }
        this._connection.sendIQ(iq, call_back, call_back);
    },
    delete: function(jid, call_back)
    {
        var item = this.findItem(jid);
        if (!item)
	    this.items.push({ jid: jid, subscription: 'remove' });

	var that = this;
	this.update(jid, null, [], function() {
	    /* TODO: detect error */
	    that.items = that.items.filter(function(item) {
		return item.jid !== jid;
	    });
	    if (call_back)
		call_back();
	});
    },
    /** PrivateFunction: _onReceiveRosterSuccess
     *
     */
    _onReceiveRosterSuccess: function(userCallback, stanza)
    {
        this._updateItems(stanza);
        userCallback(this.items);
    },
    /** PrivateFunction: _onReceiveRosterError
     *
     */
    _onReceiveRosterError: function(userCallback, stanza)
    {
        userCallback(this.items);
    },
    /** PrivateFunction: _onReceivePresence
     * Handle presence
     */
    _onReceivePresence : function(presence)
    {
        // TODO: from is optional
        var jid = presence.getAttribute('from');
        var from = Strophe.getBareJidFromJid(jid);
        var item = this.findItem(from);
        // not in roster
        if (!item)
        {
            return true;
        }
        var type = presence.getAttribute('type');
        if (type == 'unavailable')
        {
            delete item.resources[Strophe.getResourceFromJid(jid)];
        }
        else
        {
            // TODO: add timestamp
            item.resources[Strophe.getResourceFromJid(jid)] = {
                show     : (presence.getElementsByTagName('show').length != 0) ? Strophe.getText(presence.getElementsByTagName('show')[0]) : "",
                status   : (presence.getElementsByTagName('status').length != 0) ? Strophe.getText(presence.getElementsByTagName('status')[0]) : "",
                priority : (presence.getElementsByTagName('priority').length != 0) ? Strophe.getText(presence.getElementsByTagName('priority')[0]) : ""
            };
        }
        this._call_backs(this.items, item);
        return true;
    },
    /** PrivateFunction: _call_backs
     *
     */
    _call_backs : function(items, item)
    {
        for (var i = 0; i < this._callbacks.length; i++) // [].forEach my love ...
        {
            this._callbacks[i](items, item);
        }
    },
    /** PrivateFunction: _onReceiveIQ
     *
     */
    _onReceiveIQ : function(iq)
    {
        var id = iq.id;
        var from = iq.from;
        var iqresult = $iq({type: 'result', id: id, to: from});
        this._connection.send(iqresult);
        this._updateItems(iq);
        return true;
    },
    /** PrivateFunction: _updateItems
     * Update items from iq
     */
    _updateItems : function(iq)
    {
        var query = iq.getElementsByTagName('query');
        if (query.length != 0)
        {
            this.ver = query.item(0).getAttribute('ver');
            var self = this;
            Strophe.forEachChild(query.item(0), 'item',
                function (item)
                {
                    self._updateItem(item);
                }
           );
        }
        this._call_backs(this.items);
    },
    /** PrivateFunction: _updateItem
     * Update internal representation of roster item
     */
    _updateItem : function(item)
    {
        var jid           = item.getAttribute("jid");
        var name          = item.getAttribute("name");
        var subscription  = item.getAttribute("subscription");
        var groups        = [];
        Strophe.forEachChild(item, 'group',
            function(group)
            {
                groups.push(Strophe.getText(group));
            }
        );

        var item = this.findItem(jid);
        if (!item)
        {
            this.items.push({
                name         : name,
                jid          : jid,
                subscription : subscription,
                groups       : groups,
                resources    : {}
            });
        }
        else
        {
            item.name = name;
            item.subscription = subscription;
            item.group = groups;
        }
    }
});