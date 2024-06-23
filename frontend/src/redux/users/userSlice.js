import { createSlice } from '@reduxjs/toolkit';
import { dummyUser } from '../../constants/dummyData';

const getUser = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user || null;
};

export const userSlice = createSlice({
    name: 'user',
    initialState: {
        value: dummyUser
    },
    reducers: {
        login: (state, action) => {
            state.value = action.payload;
            localStorage.setItem('user', JSON.stringify(action.payload));
        },
        logout: (state) => {
            state.value = null;
            localStorage.removeItem('user');
            localStorage.removeItem('authToken'); // Remove authToken on logout
        },
        setUserRecipes: (state, action) => {
            state.value.recipes = action.payload;
        },
        addUserRecipe: (state, action) => {
            state.value.recipes = [...state.value.recipes, action.payload];
        },
        deleteUserRecipe: (state, action) => {
            const idToDelete = action.payload;
            state.value.recipes = state.value.recipes.filter((recipe) => recipe._id !== idToDelete);
        },
        updateUserRecipes: (state, action) => {
            let index = state.value.recipes.findIndex((recipe) => recipe._id === action.payload._id)
            state.value.recipes[index] = action.payload;
        }
    }
});

export const { login, logout, deleteUserRecipe, addUserRecipe, setUserRecipes, updateUserRecipes } = userSlice.actions;

export default userSlice.reducer;
