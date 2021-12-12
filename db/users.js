const knex = require('./knex')

function createUser(user){
    return knex('userCredentials').insert(user)
}

function getUser(id){
    return knex('userCredentials').where('id', id).select()
}

function getAllUsers(){
    return knex('userCredentials').select('*')
}

function deleteUser(id){
    return knex('userCredentials').where('id', id).del()
}

function updateUser(id, userData){
    return knex('userCredentials').where('id', id).update(userData)
}

function addData(data){
    return knex('new').insert(data)
}

module.exports = {
    createUser,
    getUser,
    getAllUsers,
    deleteUser,
    updateUser,
    addData
}