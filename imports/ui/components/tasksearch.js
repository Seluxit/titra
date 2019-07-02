import { FlowRouter } from 'meteor/kadira:flow-router'
import { DDP } from 'meteor/ddp-client'
import { Mongo } from 'meteor/mongo'
import { HTTP } from 'meteor/http'
import './tasksearch.html'
import Tasks from '../../api/tasks/tasks.js'
import Timecards from '../../api/timecards/timecards.js'
import Projects from '../../api/projects/projects.js'

Template.tasksearch.events({
  'mousedown .js-tasksearch-result': (event, templateInstance) => {
    event.preventDefault()
    templateInstance.$('.js-tasksearch-input').val($(event.currentTarget).children('.js-tasksearch-task-name').text())
    templateInstance.$('.js-tasksearch-results').addClass('d-none')
  },
  'focus .js-tasksearch-input': (event, templateInstance) => {
    templateInstance.$('.js-tasksearch-results').removeClass('d-none')
  },
  'blur .js-tasksearch-input': (event, templateInstance) => {
    // if (!templateInstance.filter.get()) {
    // event.stopPropagation()
    templateInstance.$('.js-tasksearch-results').addClass('d-none')
    // }
  },
  'keyup .js-tasksearch-input': (event, templateInstance) => {
    templateInstance.filter.set($(event.currentTarget).val())
    templateInstance.$('.js-tasksearch-results').removeClass('d-none')
    // templateInstance.$('.js-tasksearch-results').show()
  },
})

Template.tasksearch.onCreated(function tasksearchcreated() {
  this.filter = new ReactiveVar()
  this.wekanAPITasks = new ReactiveVar()
  // this.lastTimecards = new ReactiveVar()
  this.autorun(() => {
    if (FlowRouter.getParam('tcid')) {
      const handle = this.subscribe('singleTimecard', FlowRouter.getParam('tcid'))
      if (handle.ready()) {
        this.$('.js-tasksearch-input').val(Timecards.findOne().task)
      }
    }
  })
  this.autorun(() => {
    if (FlowRouter.getParam('projectId')) {
      const project = Projects.findOne({ _id: FlowRouter.getParam('projectId') })
      if (project) {
        if (project.wekanurl) {
          if (Meteor.settings.public.sandstorm) {
            const ddpcon = DDP.connect(project.wekanurl.replace('#', '/.sandstorm-token/'))
            this.wekanTasks = new Mongo.Collection('cards', { connection: ddpcon })
            ddpcon.subscribe('board', 'sandstorm')
          } else if (project.selectedWekanList) {
            const authToken = project.wekanurl.match(/authToken=(.*)/)[1]
            const url = project.wekanurl.substring(0, project.wekanurl.indexOf('export?'))

            try {
              HTTP.get(`${url}lists/${project.selectedWekanList}/cards`, { headers: { Authorization: `Bearer ${authToken}` } }, (innerError, innerResult) => {
                if (innerError) {
                  console.error(innerError)
                } else {
                  this.wekanAPITasks.set(innerResult.data)
                }
              })
            } catch (error) {
              console.error(error)
            }
          }
        }
      }
    }
    this.subscribe('mytasks', this.filter.get() ? this.filter.get() : '')
  })
})
Template.tasksearch.helpers({
  tasks: () => {
    if (!Template.instance().filter.get() || Template.instance().filter.get() === '') {
      return Tasks.find({}, { sort: { lastUsed: -1 }, limit: 3 })
      // return Template.instance().lastTimecards.get()
    }
    const finalArray = []
    const regex = `.*${Template.instance().filter.get().replace(/[-[\]{}()*+?.,\\/^$|#\s]/g, '\\$&')}.*`
    if (Template.instance().wekanTasks) {
      const wekanResult = Template.instance().wekanTasks.find({ title: { $regex: regex, $options: 'i' }, archived: false }, { sort: { lastUsed: -1 }, limit: 5 })
      if (wekanResult.count() > 0) {
        finalArray.push(...wekanResult.map(elem => ({ name: elem.title, wekan: true })))
      }
    } else if (Template.instance().wekanAPITasks.get()) {
      if (Template.instance().wekanAPITasks.get().length > 0) {
        finalArray.push(...Template.instance().wekanAPITasks.get().map(elem => ({ name: elem.title, wekan: true })).filter(element => new RegExp(regex, 'i').exec(element.name)))
      }
    }
    finalArray.push(...Tasks.find({ name: { $regex: regex, $options: 'i' } }, { sort: { lastUsed: -1 }, limit: 5 }).fetch())
    return finalArray.length > 0 ? finalArray.slice(0, 4) : false
  },
})
