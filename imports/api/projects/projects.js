import { Mongo } from 'meteor/mongo'
import { getGlobalSetting } from '../../utils/frontend_helpers'

function changeProjectPriority(project) {
  if(getGlobalSetting('orderProjectsGlobally') === false) {
    console.log('user prio', Meteor.user().project);
    if(Meteor.user().project) {
      console.log('new prio', project, Meteor.user().project[project['_id']]);
      project.priority = Meteor.user().project[project['_id']];
     }
  }
  return project;
}

const Projects = new Mongo.Collection('projects', {transform: changeProjectPriority})
const ProjectStats = new Mongo.Collection('projectStats')
export { ProjectStats, Projects as default }
