/**
 * @fileoverview Defined the CTATDragSource component, supports bucket sorting type tasks. 
 * Builds on CTATDragnDrop by allowing clones
 * CTAT Components are disabled in source and only enabled after being dropped into destination
 * 
 * To set up a CTATDragSource, use the following example:
 * <div id="source" class="CTATDragSource"><div>your item1</div>...</div>
 * id and class attributes are required. If no name attribute is provided, the
 * default one will be set. The name attribute is used to group CTATDragSource's
 * into groups that allow passing of items between members. Children should be given IDs.
 * The data-ctat-max-cardinality attribute can be set with an integer and the
 * CTATDragSource will reject drops if there is already that many items or more.
 * The data-ctat-max-overflow attribute can be set with an integer and the 
 * CTATDragSource will delete firstChild if there are more than max items.
 * The data-ctat-purpose attribute takes a string and determines whether a div is
 * 'source' (cloning takes place), 'destination' or 'trashcan' (deletion). Default is 'destination'
 * SAI Tip: IDs of clones are "originalID" + "--" + number,
 * where the number is generated from CTATGenSym, regex matching might be helpful
 *
 * @author: $Authors: bpek and vmt26 $
 * @version: $Revision: 1 $
 */

goog.provide('CTATDragSource');

goog.require('CTAT.Component.Base.Tutorable');
goog.require('CTAT.ComponentRegistry');
goog.require('CTATGlobalFunctions');
goog.require('CTATSAI');

/**
 *
 */
var CTATDragSource = function() {
	CTAT.Component.Base.Tutorable.call(this, "CTATDragSource", "aDnD");

	/******************* Component Parameters ***********************/
	//Group Name
	this.setParameterHandler('groupname', function(aName) {
		if (this.getDivWrap()) $(this.getDivWrap()).attr('name',aName);
	});
	// No this.data_ctat_handlers, use "name" instead.

	// Max Number of Objects, then reject drops afterwards
	this.set_child_limit = function(aNum) {
		var val = parseInt(aNum);
		if (!isNaN(val)) $(this.component).attr('data-ctat-max-cardinality', val);
	};
	this.setParameterHandler('MaxObjects', this.set_child_limit);
	this.get_child_limit = function() {
		var lim = parseInt($(this.component).attr('data-ctat-max-cardinality'));
		return isNaN(lim)?-1:lim;
	};

	// Max Number of Objects, then remove top children afterwards
	this.set_child_overflow = function(aNum) {
		var val = parseInt(aNum);
		if (!isNaN(val)) $(this.component).attr('data-ctat-max-overflow', val);
	};
	this.setParameterHandler('MaxOverflow', this.set_child_overflow);
	this.get_child_overflow = function() {
		var lim = parseInt($(this.component).attr('data-ctat-max-overflow'));
		return isNaN(lim)?-1:lim;
	};

	//set purpose of the dragSource component
	 this.set_purpose = function(aString) {
		if (aString){
			$(this.component).attr('data-ctat-purpose', aString);
		}
		else{
			$(this.component).attr('data-ctat-purpose', "destination")
		}
	};
	this.setParameterHandler("Purpose", this.set_purpose);
	this.get_purpose = function() {
	    if ($(this.component).attr('data-ctat-purpose')){
	    	return $(this.component).attr('data-ctat-purpose');
	    }
	    else{
	    	return "destination";
	    }
	 };

	/***************** Event handlers ******************/
	var hash = function (s) {
		return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0); return a&a;},0);
	};

	var handle_drag_start = function (e) {
		//console.log('Starting to drag '+e.target.id);
		var groupname = $(this).parent().attr('name');
		var parent = $(this).parent().attr('id');
		e.dataTransfer.setData('ctat/group', groupname); // encoding into type does not work as it will be forced lowercase
		e.dataTransfer.setData('ctat/source', parent);
		e.dataTransfer.setData('original', this.id);

		if ($("#" + parent).attr('data-ctat-purpose') === "source") { 
			var cloneId = this.id + "--" + CTATGlobalFunctions.gensym.div_id().slice(7);
			//suffixing number for SAI identification
			e.dataTransfer.setData('text', cloneId);
			var hid = hash(cloneId);
			e.dataTransfer.setData('ctat/id/'+hid,hid);
			CTATDragSource.dragging[hid] = {
				id: cloneId,
				group: groupname,
				source: parent
			};
		}
		else {
			e.dataTransfer.setData('text', this.id);
			var hid = hash(this.id);
			e.dataTransfer.setData('ctat/id/'+hid,hid);
			CTATDragSource.dragging[hid] = {
					id: this.id,
					group: groupname,
					source: parent
			};
		}
		
	};

	var handle_drag_end = function (e) {
		var dndid;
		for (var i=0; i<e.dataTransfer.types.length; i++) {
			//console.log(e.dataTransfer.types[i]);
			dndid = /^ctat\/id\/(.+)$/.exec(e.dataTransfer.types[i]);
			if (dndid) {
				var hid = dndid[1];
				if (CTATDragSource.dragging.hasOwnProperty(hid)) {
					// removed hash indexed information about this draggable
					delete CTATDragSource.dragging[hid];
				}
			}
		}
	};
	/********************* Initialization ************************/
	var pointer = this;
	pointer.setDisabled = function (x) { //called in init, all items in source initially disabled
		try{
			if (x.type !== 'button') {
				x.disabled = true;
			}
			if (x.children.length > 0){
				for (var i = 0; i < x.children.length; i++){
					pointer.setDisabled(x.children[i]);
				}
			}
		}
		catch (err){}
	}
	pointer.removeDisabled = function (x) { //called in drop, all items dropped in destination are enabled
		x.disabled = false;
		if (x.children.length > 0){
			for (var i = 0; i < x.children.length; i++){
				pointer.removeDisabled(x.children[i]);
			}
		}
	}
	pointer.animatedRemove = function (childID) {
    	$('#'+childID).animate({
	      opacity:0.1,
	      zoom: 1.3,
    	}, 500, 'swing', 
	      	function() {
		        var focus = document.getElementById(childID);
		        var parent = focus.parentNode;
		        parent.removeChild(focus);
	      	}
      	)
    };

	var dnd = null;
	this.init = function() {
		dnd = this.getDivWrap();
		if (!$(dnd).attr('name')) {
			var gname = CTATDragSource.default_groupname;
			if (this.getComponentGroup()) {
				gname = this.getComponentGroup();
			}
			$(dnd).attr('name',gname);
		}
		this.setComponent(dnd);
		CTATComponentReference.add(this,dnd); // Not sure we need CTATComponentReference in general...
		if (!CTATConfiguration.get('previewMode'))
		{
			$(dnd).children().addClass('CTATDragSource--item').attr({
				unselectable:'on',
				draggable: true,
			}).each(function(){
				// Add generated id if id does not exist!
				if (!this.id) this.id = CTATGlobalFunctions.gensym.div_id();
				this.addEventListener('dragstart',handle_drag_start,false);
				this.addEventListener('dragend',handle_drag_end,false);
				//this.addEventListener('dragenter');
			});
		}
		if (dnd.getAttribute('data-ctat-purpose') === "source") { //all elements in source initially disabled
			window.onload = function () {
				pointer.setDisabled(dnd);
			}
      	}
		/**
		 * @listens dragover
		 */
		this.component.addEventListener('dragover', function(e) {
			/** @this dnd */
			var allow_drop = false;
			if ($(this).data('CTATComponent').getEnabled()) { // this causes rejection when disabled
				// check for child limit
				var limit = parseInt($(this).attr('data-ctat-max-cardinality'));
				if (isNaN(limit) || limit<0 || $(this).children().length<limit) {
					var types = new Set(e.dataTransfer.types); // DOMStringList but is marked as obsolete, so convert to set
					// check if it is from a CTATDragSource
					if (types.has('ctat/group')) {
						// check if in the same group and not source
						if (e.dataTransfer.getData('text')) { // see if in Firefox and can get data
							if (e.dataTransfer.getData('ctat/group') === $(this).attr('name') && // getData does not work in webkit
									e.dataTransfer.getData('ctat/source') !== this.id) {
								allow_drop = true;
							}
						} else { // get information from hash encoded store
							var dndid;
							for (var i=0; i<e.dataTransfer.types.length; i++) {
								//console.log(e.dataTransfer.types[i]);
								dndid = /^ctat\/id\/(.+)$/.exec(e.dataTransfer.types[i]);
								if (dndid) {
									var hid = dndid[1];
									//console.log(hid);
									if (CTATDragSource.dragging.hasOwnProperty(hid) &&
											CTATDragSource.dragging[hid].group === $(this).attr('name') &&
											CTATDragSource.dragging[hid].source !== this.id) {
										allow_drop = true;
									}
								}
							}
						}
					}
				}
			}
			if ($(e.target).attr('data-ctat-purpose') === "source") { //dropping in source not allowed
        		allow_drop = false;
      		}
			if (allow_drop) {
				e.preventDefault();
				e.dataTransfer.effectAllowed = "move";
				e.dataTransfer.dropEffect = "move";
				this.classList.add('CTATDragSource--valid-drop');
				// add some component level indication of the target other than mouse icon?
			}
		}, false);

		/**
		 * @listens drop
		 */
		this.component.addEventListener('drop', function(e) {
			e.preventDefault();
			this.classList.remove('CTATDragSource--valid-drop');

			var comp = $(this).data('CTATComponent');
			if (comp.getEnabled()) { // accept things only when enabled.
				var item_id = e.dataTransfer.getData('text');
				var item;
				//console.log('CTATDragSource '+e.target.id+' got drop '+item_id);

				if (document.getElementById(item_id)){ //not a clone
					item = document.getElementById(item_id);
					this.appendChild(item);
				}

				if (!document.getElementById(item_id)){ //clone coming from a source div
					var original = document.getElementById(e.dataTransfer.getData('original'));
					item = original.cloneNode(false); //clones nodes but not children
					this.append(item);
					item.id = item_id;
					item.addEventListener('dragstart',handle_drag_start,false);
					item.addEventListener('dragend',handle_drag_end,false); //how about drops and others??

					//excerpt from mutationobserver and calling initializeHTMLComponent
					//to deal with initializing new CTAT Components
					var componentType;
					var CTATClassRegex = /(CTAT[A-z]*)(\s|$)/g;
					var ctatClass = CTATClassRegex.exec(item.className)
					if (ctatClass){
						for (var i = 0; i < ctatClass.length; i++) {
				            if (CTAT.ComponentRegistry[ctatClass[i]]) {
				              componentType = ctatClass[i];
				            }
				        }
				    }
				    if (componentType){ //if clone is a CTAT Component, initialize it as such
				    	CTATTutor.initializeHTMLComponent(item, componentType);
				    }
				    
				    item.setAttribute('draggable', true);
					item.setAttribute('unselectable', 'on');

				    var oldLength = original.childNodes.length;
				    var newLength = item.childNodes.length;

		    		original.classList.remove("CTAT--correct");
		    		original.classList.remove("CTAT--incorrect");
		    		original.classList.remove("CTAT--hint");

		    		if (newLength === oldLength){ //case of no children or ctat components with same no. of children
				    	for (var i = 0; i < newLength; i++){
				    		item.childNodes[i].setAttribute('class', original.childNodes[i].className);
				    		item.childNodes[i].setAttribute('value',original.childNodes[i].value);
				    		item.childNodes[i].innerHTML = original.childNodes[i].innerHTML;

				    		/*
				    		original.childNodes[i].classList.remove("CTAT--correct");
				    		original.childNodes[i].classList.remove("CTAT--incorrect");
				    		original.childNodes[i].classList.remove("CTAT--hint");
				    		*/
					    }
					}
					if (oldLength !== newLength){ //case of non-ctat component with children
						while (item.hasChildNodes()){ //extra
							item.removeChild(item.lastChild);
						}
						for (var i = 0; i < oldLength; i++){
				    		item.appendChild(original.childNodes[i].cloneNode(true));

				    		/*
				    		original.childNodes[i].classList.remove("CTAT--correct");
				    		original.childNodes[i].classList.remove("CTAT--incorrect");
				    		original.childNodes[i].classList.remove("CTAT--hint");
				    		*/
					    }
					}
				}

				//if (this.classList.contains('trashcan')){
				if ($(this).attr('data-ctat-purpose') === "trashcan") {
					this.removeChild(item);
				}
				//if (this.classList.contains('source')){
				if ($(this).attr('data-ctat-purpose') === "source") {
					this.removeChild(item);
				}
				//if (this.classList.contains('destination')) {
				if ($(this).attr('data-ctat-purpose') === "destination" || !($(this).attr('data-ctat-purpose'))) {
					$('#'+item.id).removeClass('CTAT--correct CTAT--incorrect CTAT--hint');
					pointer.removeDisabled(item);
					comp.setActionInput('Add',item_id);
					//console.log(comp.getSAI().getSelection(),comp.getSAI().getAction(),comp.getSAI().getInput());
					comp.processAction();

					if ($(this).attr('data-ctat-max-overflow') !== null && 
						this.childNodes.length > $(this).attr('data-ctat-max-overflow')){
						pointer.animatedRemove(this.firstChild.id);
					}
				}
			}
		}, false);

		// needed for unhighlighting.
		this.component.addEventListener('dragleave', function(e) {
			this.classList.remove('CTATDragSource--valid-drop');
		}, false);
		this.setInitialized(true);
	};
	/**
	 * This is run during the generation of InterfaceDescription messages and
	 * it generates interface actions for options set by the author in the
	 * html code.
	 * @returns {Array<CTATSAI>} of SAIs.
	 */
	this.getConfigurationActions = function () {
		var actions = [];
		var items = [];
		$(this.component).children().each(function() {
			items.push($(this).attr('id'));
		});
		if (items.length>0) {
			var sai = new CTATSAI();
			sai.setSelection(this.getName());
			sai.setAction('SetChildren');
			sai.setInput(items.sort().join(';'));
			actions.push(sai);
		}
	    return actions;
	};

	var super_setEnabled = this.setEnabled;
	this.setEnabled = function (bool) {
		super_setEnabled(bool);
		if (dnd) {
			$(dnd).children().attr('draggable',bool);
			if (this.getDisableOnCorrect()) {
				$(dnd).find('.CTAT--correct').attr('draggable',false);
			}
		}
	};
	/******************* Interface Actions **********************/
	/**
	 * Moves the entity with the given id to this component.
	 * @param {String} aId - the id of an entity in the dom.
	 * Note: this method tests if the entity has the CTAT-DragSource--item class
	 * and if it does not, it will add it, set some appropriate properties, and
	 * add appropriate event listeners.
	 */
	this.Add = function(aId) {
		var target = $('#'+aId);
		if (target.length>0) {
			target.appendTo(this.getDivWrap());
		}
		if (!$(target).hasClass('CTATDragSource--item')) {
			$(target).addClass('CTATDragSource--item').attr({
				unselectable:'on',
				draggable: true,
			});
			target.addEventListener('dragstart',handle_drag_start,false);
			target.addEventListener('dragend',handle_drag_end,false);
		}
	};
	/**
	 * Moves the entities with the given id's to this component.
	 * @param {String} aId - a ; deliminated list of id's of entities in the dom.
	 */
	this.SetChildren = function(list_of_ids) {
		list_of_ids.split(';').forEach(function (aId) {
			this.Add(aId);
		}, this);
	};

	/**************** Grading **************************/
	this.updateSAI = function() {
		var items = [];
		$(this.component).children().each(function() {
			items.push($(this).attr('id'));
		});
		//console.log('SetChildren',items.join(';'));
		this.setActionInput('SetChildren',items.sort().join(';'));
	};
	var super_showCorrect = this.showCorrect.bind(this);
	this.showCorrect = function(aSAI) {
		var action = aSAI.getAction();
		//console.log(this.getName(),'showCorrect',action);
		switch (action) {
		case "Add":
			this.setEnabled(true);
			var id = aSAI.getInput();
			$('#'+id).addClass('CTAT--correct');
			//console.log(this.getDisableOnCorrect());
			if (this.getDisableOnCorrect()) {
				$('#'+id).attr('draggable',false);
			}
			break;
		case "SetChildren":
		default:
			super_showCorrect(aSAI);
			break;
		}
	};
	var super_showInCorrect = this.showInCorrect.bind(this);
	this.showInCorrect = function(aSAI) {
		var action = aSAI.getAction();
		//console.log(this.getName(),'showInCorrect',action);
		switch (action) {
		case "Add":
			var id = aSAI.getInput();
			$('#'+id).addClass('CTAT--incorrect');
			break;
		case "SetChildren":
		default:
			super_showInCorrect(aSAI);
			break;
		}
	};
};

CTATDragSource.dragging = {};
CTATDragSource.default_groupname = 'DragNDropGroup'; //for compatibility with DragNDrop


CTATDragSource.prototype = Object.create(CTAT.Component.Base.Tutorable.prototype);
CTATDragSource.prototype.constructor = CTATDragSource;

CTAT.ComponentRegistry.addComponentType('CTATDragSource', CTATDragSource);
