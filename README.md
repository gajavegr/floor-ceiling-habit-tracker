# Floor Ceiling Habit Tracker

Frustrated by the ubiquitous pay-walls and general inflexibility that plague other habit/goal trackers, Gaurav and Ganesh set out to make the Floor Ceiling Habit Tracker.

## Inspiration
To find a new way to structure goals so that they can be achieved via habits, we watched this [video](https://youtu.be/Oq46-UCWuZ4?si=9fXKqucVtA_gBxly).

The gist is that an individual should avoid thinking of specific achievements or accomplishments as missing out on them can be demoralizing, but instead allow for some more nuance.

Here's how you can follow this methodology:
1. Define the areas in which you want to improve (e.g., Relationships, Fun, Health, Finances)
2. Define a **floor** and **ceiling** goal for each area that lets you make progress in each area you want to improve.
   - The floor should be easy enough that you can do it without it hindering your other priorities too much.
   - The ceiling should be hard enough that you truly do have to do a lot of work to get it done
  
With these defined, now you can foster some trust in yourself, where each time you set out to do a task, you're able to accomplish it. Over time you will achieve each goal closer and closer to the ceiling because you're not shooting yourself down each time you miss it, but instead rewarding yourself each time you're above the floor.

## Implementation
As of 01/02/2025, the app is a website which uses JSON files as a database and a React front-end. The site will be hosted on a Google Cloud VM but may be shifted elsewhere for the sake of cost.

## Goal
The goal is to create something simple enough to be used to manually set, add, and verify progress towards goals but ideally, we'll be able to leverage the passively generated user data (location data, health data, and more) to automatedly track whether your goals are being achieved and provide insights as to why they may/may not be.

## Usage

### Quick Start Guide

To run this web app locally:
1. clone this repo
`https://github.com/gajavegr/floor-ceiling-habit-tracker.git`
2. make sure you have `npm v8.5.5`, `node v16.15.0`, and VS Code installed:
```
npm install -g npm@8.5.5
nvm install 16.15.0
Latest VS Code: https://code.visualstudio.com/download
```
3. Install all of the npm package from `package-lock.json`:
```
npm ci
```
4. Go into the project directory and start the front-end and the back-end:
```
# From a terminal where the current directory is the root of the floor-ceiling-habit-tracker repo
cd goal-tracker

# Start Front-end:
npm start

# Start Server (in a separate terminal):
npm run dev
```